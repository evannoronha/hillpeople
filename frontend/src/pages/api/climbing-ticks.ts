import type { APIRoute } from 'astro';
import { fetchClimbingTicksPaginated, type ClimbingTick } from '../../lib/api';

interface TransformedTick {
    documentId: string;
    tickDate: string;
    style: string;
    leadStyle: string;
    yourStars: number;
    route: {
        name: string;
        rating: string;
        routeType: string;
        location: string;
        mountainProjectUrl: string;
    } | null;
    person: {
        name: string;
    } | null;
}

export const GET: APIRoute = async ({ url }) => {
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '50', 10);

    const { ticks, pagination } = await fetchClimbingTicksPaginated(page, pageSize);

    // Transform ticks to include only needed fields
    const transformedTicks: TransformedTick[] = ticks.map((tick: ClimbingTick) => ({
        documentId: tick.documentId,
        tickDate: tick.tickDate,
        style: tick.style,
        leadStyle: tick.leadStyle,
        yourStars: tick.yourStars,
        route: tick.route ? {
            name: tick.route.name,
            rating: tick.route.rating,
            routeType: tick.route.routeType,
            location: tick.route.location,
            mountainProjectUrl: tick.route.mountainProjectUrl,
        } : null,
        person: tick.person ? {
            name: tick.person.name,
        } : null,
    }));

    return new Response(JSON.stringify({
        ticks: transformedTicks,
        pagination,
    }), {
        status: 200,
        headers: {
            'Content-Type': 'application/json',
        },
    });
};
