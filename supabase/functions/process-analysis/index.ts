import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'https://deno.land/x/openai@v4.26.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, scoreData } = await req.json();

    // Initialize OpenAI
    const openai = new OpenAI({
      apiKey: Deno.env.get('OPENAI_API_KEY')
    });

    // Update status to processing
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabaseAdmin
      .from('analysis_requests')
      .update({ status: 'processing' })
      .eq('email', email);

    // Generate analysis
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an expert business analyst specializing in creator businesses.'
        },
        {
          role: 'user',
          content: `Generate a detailed business analysis for a creator with:
            Score: ${scoreData.totalScore}/100
            Revenue: ${scoreData.revenueScore.score}/${scoreData.revenueScore.maxScore}
            Tax: ${scoreData.taxScore.score}/${scoreData.taxScore.maxScore}
            Growth: ${scoreData.growthScore.score}/${scoreData.growthScore.maxScore}
            
            Business Details:
            - Monthly Revenue: $${scoreData.formData.revenueAmounts.monthlyRevenue}
            - Structure: ${scoreData.formData.businessStructure}
            - Age: ${scoreData.formData.businessAge}
            - Team: ${scoreData.formData.employees}
            
            Provide:
            1. Executive Summary
            2. Top 3 Priority Actions
            3. 90-Day Growth Plan
            4. Tax Strategy
            5. Revenue Optimization
            6. Risk Management`
        }
      ]
    });

    const analysis = completion.choices[0].message?.content;

    if (!analysis) {
      throw new Error('Failed to generate analysis');
    }

    // Update database with analysis
    const { error: updateError } = await supabaseAdmin
      .from('analysis_requests')
      .update({
        analysis_text: analysis,
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('email', email);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);

    // Update request status to failed
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    await supabaseAdmin
      .from('analysis_requests')
      .update({
        status: 'failed',
        error_message: error.message,
        updated_at: new Date().toISOString()
      })
      .eq('email', email);

    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});