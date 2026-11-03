import { createResponsesCall } from "../_shared/responses.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-lovable-aig-run-id",
  "Access-Control-Expose-Headers": "X-Lovable-AIG-Run-ID",
};

const INSTRUCTIONS = `You are a supportive licensure-pacing coach for a California AMFT working toward LMFT licensure (BBS requirements: 3,000 total supervised hours, 1,750 direct client hours, 500 couples/family hours, 104 weeks of supervision).
You receive the user's target completion date, the weekly pace required in each category, their recent weekly averages (last 8 logged weeks), and their projection settings.
Calculation rules used by the app: weeks left = (target date − today) ÷ 7; needed per week = remaining ÷ weeks left; a category is on track when recent average ≥ needed per week; supervision weeks accrue one per logged week.
Answer the question directly, show the relevant arithmetic with the user's real numbers, and give 2–4 concrete, actionable suggestions (caseload, session scheduling, couples/family mix, cancellations, vacation planning, adjusting the target). Be concise, use short markdown sections or bullets. Do not invent numbers that are not in the data. Remind them to confirm requirements with their supervisor or the BBS when relevant.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "AI is not configured." }, 500);

    const { question, context } = await req.json();
    if (typeof question !== "string" || !question.trim() || question.length > 2000) {
      return json({ error: "Please enter a question (under 2,000 characters)." }, 400);
    }

    const call = createResponsesCall(
      req,
      { baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, model: "openai/gpt-6-astra" },
      [{ role: "user", content: `My pacing data (JSON):\n${JSON.stringify(context).slice(0, 12000)}\n\nMy question: ${question}` }],
      INSTRUCTIONS,
    );
    const text = await call.result.text;
    if (!text.trim()) return json({ error: "The assistant couldn't answer that. Try a different question." }, 502);
    return json({ answer: text });
  } catch (e) {
    const status = (e as { statusCode?: number })?.statusCode;
    if (status === 429) return json({ error: "Too many requests right now — please wait a moment and try again." }, 429);
    if (status === 402) return json({ error: "AI credits are used up. Add credits in your workspace to keep using the assistant." }, 402);
    if (status === 403) return json({ error: "AI access is currently blocked for this workspace." }, 403);
    console.error("pacing-coach error", e);
    return json({ error: "Something went wrong getting an answer. Please try again." }, 500);
  }
});
