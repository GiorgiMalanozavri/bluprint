
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("query") || "Technology";
    const location = searchParams.get("location") || "USA";

    // Construct a search query that works well for students
    // The API likely expects a simple string.
    // We'll combine query + location for the search term if the API supports it,
    // or pass them separately if parameters allow.
    // For "Real-Time Events Search", usually 'query' is the main driver.
    const searchTerm = `${query} in ${location}`;

    console.log("------------------------------------------------");
    console.log("API: Fetching events for:", searchTerm);

    if (!process.env.RAPID_API_KEY) {
        console.error("API Error: RAPID_API_KEY is missing");
        return NextResponse.json({ error: "Server Configuration Error: RAPID_API_KEY missing" }, { status: 500 });
    }

    const options = {
        method: 'GET',
        headers: {
            'x-rapidapi-key': process.env.RAPID_API_KEY,
            'x-rapidapi-host': 'real-time-events-search.p.rapidapi.com'
        }
    };

    try {
        // Using the 'search-events' endpoint
        const response = await fetch(
            `https://real-time-events-search.p.rapidapi.com/search-events?query=${encodeURIComponent(searchTerm)}&date=any`,
            options
        );

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Events API Error (${response.status}):`, errorBody);

            if (response.status === 403) {
                return NextResponse.json(
                    { error: "API Key Invalid or Not Subscribed to 'Real-Time Events Search'. Please subscribe on RapidAPI." },
                    { status: 403 }
                );
            }
            throw new Error(`Events API Error: ${response.status}`);
        }

        const data = await response.json();
        return NextResponse.json({ data: data.data || [] });
    } catch (error: any) {
        console.error("Event Fetch Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
