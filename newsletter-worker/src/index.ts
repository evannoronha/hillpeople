import { EmailMessage } from 'cloudflare:email';
import { createMimeMessage } from 'mimetext';

interface Env {
  EMAIL: SendEmail;
  STRAPI_API_URL: string;
  STRAPI_NEWSLETTER_TOKEN: string;
  FRONTEND_URL: string;
  SENDER_EMAIL: string;
  WORKER_URL: string;
}

interface SendEmail {
  send(message: EmailMessage): Promise<void>;
}

interface Subscriber {
  id: number;
  documentId: string;
  email: string;
  confirmed: boolean;
  unsubscribeToken: string;
}

interface Post {
  id: number;
  documentId: string;
  title: string;
  slug: string;
  publishedDate: string;
  updatedAt: string;
  newsletterSent: boolean;
}

interface StrapiResponse<T> {
  data: T;
  meta?: {
    pagination?: {
      total: number;
    };
  };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers for Strapi to call this worker
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // GET /health - Health check endpoint
      if (path === '/health' && request.method === 'GET') {
        const strapiOk = await checkStrapiConnection(env);
        const status = strapiOk ? 200 : 503;
        return new Response(JSON.stringify({
          status: strapiOk ? 'healthy' : 'unhealthy',
          strapi: strapiOk ? 'connected' : 'unreachable',
        }), {
          status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // POST /send-confirmation - Called by Strapi when a new subscriber is created
      if (path === '/send-confirmation' && request.method === 'POST') {
        const body = await request.json() as { email: string; confirmationToken: string };
        console.log('Received /send-confirmation request:', JSON.stringify(body));
        await sendConfirmationEmail(env, body.email, body.confirmationToken);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // GET /confirm/:token - Confirms a subscriber
      if (path.startsWith('/confirm/')) {
        const token = path.replace('/confirm/', '');
        const result = await confirmSubscriber(env, token);
        if (result.success) {
          // Redirect to success page
          return Response.redirect(`${env.FRONTEND_URL}/newsletter/confirmed`, 302);
        }
        return Response.redirect(`${env.FRONTEND_URL}/newsletter/error?message=${encodeURIComponent(result.error || 'Invalid token')}`, 302);
      }

      // GET /unsubscribe/:token - Unsubscribes a user
      if (path.startsWith('/unsubscribe/')) {
        const token = path.replace('/unsubscribe/', '');
        const result = await unsubscribeUser(env, token);
        if (result.success) {
          return Response.redirect(`${env.FRONTEND_URL}/newsletter/unsubscribed`, 302);
        }
        return Response.redirect(`${env.FRONTEND_URL}/newsletter/error?message=${encodeURIComponent(result.error || 'Invalid token')}`, 302);
      }

      // POST /trigger-newsletter - Manual trigger for testing
      if (path === '/trigger-newsletter' && request.method === 'POST') {
        // Parse optional overrides from request body
        const body = await request.json().catch(() => ({})) as {
          to?: string;
          posts?: number[];
        };
        await sendNewsletter(env, body.to, body.posts);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response('Not Found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('Worker error:', error);
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },

  // Cron trigger - runs daily at 9 AM UTC
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(sendNewsletter(env));
  },
};

async function checkStrapiConnection(env: Env): Promise<boolean> {
  try {
    const response = await fetch(`${env.STRAPI_API_URL}/api/posts?pagination[limit]=1`, {
      headers: { Authorization: `Bearer ${env.STRAPI_NEWSLETTER_TOKEN}` },
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function sendConfirmationEmail(env: Env, email: string, token: string): Promise<void> {
  console.log(`Sending confirmation email to ${email}`);
  const confirmUrl = `${env.WORKER_URL}/confirm/${token}`;

  const msg = createMimeMessage();
  msg.setSender({ name: 'Hill People', addr: env.SENDER_EMAIL });
  msg.setRecipient(email);
  msg.setSubject('Confirm your subscription to Hill People');
  msg.addMessage({
    contentType: 'text/html',
    data: `
      <div style="max-width: 600px; margin: 0 auto; font-family: Georgia, serif; padding: 20px;">
        <h1 style="color: #643f41;">Welcome to Hill People!</h1>
        <p>Thanks for subscribing to our newsletter. Please confirm your subscription by clicking the link below:</p>
        <p style="margin: 30px 0;">
          <a href="${confirmUrl}" style="background-color: #627f7c; color: #f4f2ec; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
            Confirm Subscription
          </a>
        </p>
        <p style="color: #666; font-size: 14px;">This link expires in 24 hours.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
      </div>
    `,
  });

  const message = new EmailMessage(env.SENDER_EMAIL, email, msg.asRaw());
  console.log(`Sending email from ${env.SENDER_EMAIL} to ${email}`);
  await env.EMAIL.send(message);
  console.log(`Confirmation email sent successfully to ${email}`);
}

async function confirmSubscriber(env: Env, token: string): Promise<{ success: boolean; error?: string }> {
  // Find subscriber by confirmation token
  const response = await fetch(
    `${env.STRAPI_API_URL}/api/subscribers?filters[confirmationToken][$eq]=${token}`,
    {
      headers: {
        Authorization: `Bearer ${env.STRAPI_NEWSLETTER_TOKEN}`,
      },
    }
  );

  const data = await response.json() as StrapiResponse<Subscriber[]>;
  if (!data.data || data.data.length === 0) {
    return { success: false, error: 'Invalid or expired confirmation token' };
  }

  const subscriber = data.data[0];

  // Update subscriber to confirmed
  await fetch(`${env.STRAPI_API_URL}/api/subscribers/${subscriber.documentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.STRAPI_NEWSLETTER_TOKEN}`,
    },
    body: JSON.stringify({
      data: {
        confirmed: true,
        subscribedAt: new Date().toISOString(),
        confirmationToken: null,
        tokenExpiry: null,
      },
    }),
  });

  return { success: true };
}

async function unsubscribeUser(env: Env, token: string): Promise<{ success: boolean; error?: string }> {
  // Find subscriber by unsubscribe token
  const response = await fetch(
    `${env.STRAPI_API_URL}/api/subscribers?filters[unsubscribeToken][$eq]=${token}`,
    {
      headers: {
        Authorization: `Bearer ${env.STRAPI_NEWSLETTER_TOKEN}`,
      },
    }
  );

  const data = await response.json() as StrapiResponse<Subscriber[]>;
  if (!data.data || data.data.length === 0) {
    return { success: false, error: 'Invalid unsubscribe token' };
  }

  const subscriber = data.data[0];

  // Delete subscriber
  await fetch(`${env.STRAPI_API_URL}/api/subscribers/${subscriber.documentId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${env.STRAPI_NEWSLETTER_TOKEN}`,
    },
  });

  return { success: true };
}

async function sendNewsletter(env: Env, toOverride?: string, postIdsOverride?: number[]): Promise<void> {
  console.log('Starting newsletter send...');

  // Get eligible posts (published, not sent, not updated in last 12 hours)
  const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

  let posts: Post[];
  if (postIdsOverride && postIdsOverride.length > 0) {
    // Fetch specific posts by ID
    const postFilters = postIdsOverride.map(id => `filters[id][$in]=${id}`).join('&');
    const response = await fetch(
      `${env.STRAPI_API_URL}/api/posts?${postFilters}&filters[publishedAt][$notNull]=true`,
      {
        headers: { Authorization: `Bearer ${env.STRAPI_NEWSLETTER_TOKEN}` },
      }
    );
    const data = await response.json() as StrapiResponse<Post[]>;
    posts = data.data || [];
  } else {
    // Fetch posts that haven't been sent and weren't recently updated
    const response = await fetch(
      `${env.STRAPI_API_URL}/api/posts?filters[publishedAt][$notNull]=true&filters[newsletterSent][$eq]=false&filters[updatedAt][$lt]=${twelveHoursAgo}&sort=publishedDate:desc`,
      {
        headers: { Authorization: `Bearer ${env.STRAPI_NEWSLETTER_TOKEN}` },
      }
    );
    const data = await response.json() as StrapiResponse<Post[]>;
    posts = data.data || [];
  }

  if (posts.length === 0) {
    console.log('No posts to send');
    return;
  }

  console.log(`Found ${posts.length} posts to send`);

  // Get confirmed subscribers
  let subscribers: Subscriber[];
  if (toOverride) {
    // Send to specific email only
    subscribers = [{ id: 0, documentId: '', email: toOverride, confirmed: true, unsubscribeToken: '' }];
  } else {
    const response = await fetch(
      `${env.STRAPI_API_URL}/api/subscribers?filters[confirmed][$eq]=true&pagination[limit]=1000`,
      {
        headers: { Authorization: `Bearer ${env.STRAPI_NEWSLETTER_TOKEN}` },
      }
    );
    const data = await response.json() as StrapiResponse<Subscriber[]>;
    subscribers = data.data || [];
  }

  if (subscribers.length === 0) {
    console.log('No confirmed subscribers');
    return;
  }

  console.log(`Sending to ${subscribers.length} subscribers`);

  // Generate newsletter HTML
  const postsHtml = posts.map(post => `
    <div style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 1px solid #e0e0e0;">
      <h2 style="margin: 0 0 10px 0;">
        <a href="${env.FRONTEND_URL}/blog/${post.slug}" style="color: #f16e53; text-decoration: none;">
          ${post.title}
        </a>
      </h2>
      <p style="color: #666; font-size: 14px; margin: 0;">
        ${new Date(post.publishedDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  `).join('');

  // Send to each subscriber
  for (const subscriber of subscribers) {
    try {
      const unsubscribeUrl = subscriber.unsubscribeToken
        ? `${env.WORKER_URL}/unsubscribe/${subscriber.unsubscribeToken}`
        : `${env.FRONTEND_URL}/newsletter/unsubscribe`;

      const msg = createMimeMessage();
      msg.setSender({ name: 'Hill People', addr: env.SENDER_EMAIL });
      msg.setRecipient(subscriber.email);
      msg.setSubject(`New from Hill People: ${posts.length} new post${posts.length > 1 ? 's' : ''}`);
      msg.addMessage({
        contentType: 'text/html',
        data: `
          <div style="max-width: 600px; margin: 0 auto; font-family: Georgia, serif; padding: 20px;">
            <h1 style="color: #643f41; margin-bottom: 30px;">New from Hill People</h1>
            ${postsHtml}
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />
            <p style="font-size: 12px; color: #999;">
              You received this because you subscribed to Hill People newsletter.
              <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
            </p>
          </div>
        `,
      });

      const message = new EmailMessage(env.SENDER_EMAIL, subscriber.email, msg.asRaw());
      await env.EMAIL.send(message);
      console.log(`Sent to ${subscriber.email}`);
    } catch (error) {
      console.error(`Failed to send to ${subscriber.email}:`, error);
    }
  }

  // Mark posts as sent (skip if using override)
  if (!postIdsOverride) {
    for (const post of posts) {
      try {
        await fetch(`${env.STRAPI_API_URL}/api/posts/${post.documentId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${env.STRAPI_NEWSLETTER_TOKEN}`,
          },
          body: JSON.stringify({
            data: { newsletterSent: true },
          }),
        });
        console.log(`Marked post ${post.id} as sent`);
      } catch (error) {
        console.error(`Failed to mark post ${post.id} as sent:`, error);
      }
    }
  }

  console.log('Newsletter send complete');
}
