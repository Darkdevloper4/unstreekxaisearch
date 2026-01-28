// @ts-ignore
declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // 1. Handle CORS Preflight Request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 2. Parse User Request
    const { query } = await req.json();

    if (!query) {
      throw new Error("Missing 'query' in request body");
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error("Server Misconfiguration: GEMINI_API_KEY is missing");
    }

    // 3. Call Gemini API (v1beta with gemini-3-flash-preview)
    // We use the REST API directly to avoid package dependencies in Deno
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiApiKey}`;

    const payload = {
      contents: [
        {
          parts: [{ text: query }]
        }
      ],
      // Enable Google Search Grounding
      tools: [
        {
          google_search: {} 
        }
      ],
      // System Prompt for Perplexity-like behavior
      system_instruction: {
        parts: [
          { 
            text: "You are a professional AI search engine. Provide a detailed, factual answer based on the search results. Use markdown for formatting and include numbered citations like [1], [2] next to the facts." 
          }
        ]
      }
    };

    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error("Gemini API Error:", data);
      throw new Error(data.error?.message || "Failed to generate content from Gemini");
    }

    // 4. Extract Answer and Grounding Metadata
    const candidate = data.candidates?.[0];
    const answer = candidate?.content?.parts?.[0]?.text || "I couldn't generate an answer based on the search results.";
    
    // groundingMetadata contains web search queries and source chunks
    const groundingMetadata = candidate?.groundingMetadata || null;

    // 5. Return JSON Response
    return new Response(
      JSON.stringify({ 
        answer, 
        groundingMetadata 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});