interface Env {
  RESEND_API_KEY: string;
  STRAPI_API_URL: string;
  STRAPI_NEWSLETTER_TOKEN: string;
  FRONTEND_URL: string;
  SENDER_EMAIL: string;
  WORKER_URL: string;
  GODMODE_TOKEN: string;
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

interface ResendResponse {
  id?: string;
  error?: {
    message: string;
    name: string;
  };
}

interface NewsletterOptions {
  // How to select posts
  slugs?: string[];           // Fetch specific posts by slug
  applyEligibilityFilters?: boolean;  // Apply newsletterSent=false and updatedAt filters

  // Recipient options
  toOverride?: string;        // Send to specific email instead of subscribers

  // Side effects
  markPostsAsSent?: boolean;  // Update posts in Strapi after sending
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

      // POST /trigger-newsletter - Normal newsletter trigger (cron or manual)
      if (path === '/trigger-newsletter' && request.method === 'POST') {
        await sendNewsletter(env, {
          applyEligibilityFilters: true,
          markPostsAsSent: true,
        });
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // POST /godmode - Bypass all filters, requires auth token
      if (path === '/godmode' && request.method === 'POST') {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader || authHeader !== `Bearer ${env.GODMODE_TOKEN}`) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        const body = await request.json() as { to?: string; slugs: string[] };

        if (!body.slugs || body.slugs.length === 0) {
          return new Response(JSON.stringify({ error: 'slugs array is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        await sendNewsletter(env, {
          slugs: body.slugs,
          toOverride: body.to,
          applyEligibilityFilters: false,
          markPostsAsSent: false,
        });
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
    ctx.waitUntil(sendNewsletter(env, {
      applyEligibilityFilters: true,
      markPostsAsSent: true,
    }));
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

async function sendEmail(env: Env, to: string, subject: string, html: string): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Hill People <${env.SENDER_EMAIL}>`,
      to: [to],
      subject,
      html,
    }),
  });

  const data = await response.json() as ResendResponse;

  if (!response.ok) {
    throw new Error(`Resend API error: ${data.error?.message || response.statusText}`);
  }

  console.log(`Email sent successfully, id: ${data.id}`);
}

async function sendConfirmationEmail(env: Env, email: string, token: string): Promise<void> {
  console.log(`Sending confirmation email to ${email}`);
  const confirmUrl = `${env.WORKER_URL}/confirm/${token}`;

  const html = `
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
  `;

  await sendEmail(env, email, 'Confirm your subscription to Hill People', html);
  console.log(`Confirmation email sent successfully to ${email}`);
}

async function confirmSubscriber(env: Env, token: string): Promise<{ success: boolean; error?: string }> {
  // Find subscriber by confirmation token
  const url = `${env.STRAPI_API_URL}/api/subscribers?filters[confirmationToken][$eq]=${token}`;
  console.log(`Looking up subscriber with token: ${token.substring(0, 8)}...`);
  console.log(`Strapi URL: ${url}`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${env.STRAPI_NEWSLETTER_TOKEN}`,
    },
  });

  console.log(`Strapi response status: ${response.status}`);
  const data = await response.json() as StrapiResponse<Subscriber[]>;
  console.log(`Strapi response data: ${JSON.stringify(data)}`);

  if (!data.data || data.data.length === 0) {
    return { success: false, error: 'Invalid or expired confirmation token' };
  }

  const subscriber = data.data[0];
  console.log(`Found subscriber: ${subscriber.documentId}`);

  // Update subscriber to confirmed
  const updateUrl = `${env.STRAPI_API_URL}/api/subscribers/${subscriber.documentId}`;
  const updateBody = {
    data: {
      confirmed: true,
      subscribedAt: new Date().toISOString(),
      confirmationToken: null,
      tokenExpiry: null,
    },
  };
  console.log(`Updating subscriber at: ${updateUrl}`);
  console.log(`Update body: ${JSON.stringify(updateBody)}`);

  const updateResponse = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.STRAPI_NEWSLETTER_TOKEN}`,
    },
    body: JSON.stringify(updateBody),
  });

  console.log(`Update response status: ${updateResponse.status}`);
  const updateData = await updateResponse.text();
  console.log(`Update response: ${updateData}`);

  if (!updateResponse.ok) {
    return { success: false, error: `Failed to update subscriber: ${updateResponse.status}` };
  }

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

async function sendNewsletter(env: Env, options: NewsletterOptions): Promise<void> {
  const {
    slugs,
    applyEligibilityFilters = true,
    toOverride,
    markPostsAsSent = true,
  } = options;

  const logPrefix = slugs ? '[GODMODE]' : '';
  console.log(`${logPrefix} Starting newsletter send...`);

  // Fetch posts
  let posts: Post[];

  if (slugs && slugs.length > 0) {
    // Fetch specific posts by slug
    const slugFilters = slugs.map((slug, i) => `filters[slug][$in][${i}]=${encodeURIComponent(slug)}`).join('&');
    const url = `${env.STRAPI_API_URL}/api/posts?${slugFilters}`;
    console.log(`${logPrefix} Fetching posts by slug: ${url}`);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${env.STRAPI_NEWSLETTER_TOKEN}` },
    });
    const data = await response.json() as StrapiResponse<Post[]>;
    posts = data.data || [];
  } else if (applyEligibilityFilters) {
    // Fetch eligible posts (published, not sent, not updated in last 30 minutes)
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const url = `${env.STRAPI_API_URL}/api/posts?filters[publishedAt][$notNull]=true&filters[newsletterSent][$eq]=false&filters[updatedAt][$lt]=${thirtyMinutesAgo}&sort=publishedDate:desc`;
    console.log(`${logPrefix} Fetching eligible posts: ${url}`);

    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${env.STRAPI_NEWSLETTER_TOKEN}` },
    });
    const data = await response.json() as StrapiResponse<Post[]>;
    posts = data.data || [];
  } else {
    console.log(`${logPrefix} No post selection criteria provided`);
    return;
  }

  if (posts.length === 0) {
    console.log(`${logPrefix} No posts to send`);
    return;
  }

  console.log(`${logPrefix} Found ${posts.length} posts to send`);

  // Get subscribers
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
    console.log(`${logPrefix} No confirmed subscribers`);
    return;
  }

  console.log(`${logPrefix} Sending to ${subscribers.length} subscribers`);

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

      const html = `
        <div style="max-width: 600px; margin: 0 auto; font-family: Georgia, serif; padding: 20px;">
          <h1 style="color: #643f41; margin-bottom: 30px;">New from Hill People</h1>
          ${postsHtml}
          <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;" />
          <p style="font-size: 12px; color: #999;">
            You received this because you subscribed to Hill People newsletter.
            <a href="${unsubscribeUrl}" style="color: #999;">Unsubscribe</a>
          </p>
        </div>
      `;

      await sendEmail(
        env,
        subscriber.email,
        `New from Hill People: ${posts.length} new post${posts.length > 1 ? 's' : ''}`,
        html
      );
      console.log(`${logPrefix} Sent to ${subscriber.email}`);
    } catch (error) {
      console.error(`${logPrefix} Failed to send to ${subscriber.email}:`, error);
    }
  }

  // Mark posts as sent
  if (markPostsAsSent) {
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
        console.log(`${logPrefix} Marked post ${post.slug} as sent`);
      } catch (error) {
        console.error(`${logPrefix} Failed to mark post ${post.slug} as sent:`, error);
      }
    }
  } else {
    console.log(`${logPrefix} Skipping mark-as-sent (disabled)`);
  }

  console.log(`${logPrefix} Newsletter send complete`);
}
