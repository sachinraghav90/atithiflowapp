import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RECAPTCHA_SECRET_KEY = Deno.env.get('RECAPTCHA_SECRET_KEY');
const EXPECTED_ACTION = 'contact_submit';
const SCORE_THRESHOLD = 0.5;

interface RecaptchaVerifyResponse {
  success: boolean;
  score?: number;
  action?: string;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
}

interface VerifyRequest {
  event: {
    token: string;
    expectedAction: string;
    siteKey: string;
  };
  formData: {
    name: string;
    email: string;
    phone?: string;
    hotelName: string;
    propertySize?: string;
    country?: string;
    message?: string;
    selectedModules?: string[];
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RECAPTCHA_SECRET_KEY) {
      console.error('RECAPTCHA_SECRET_KEY is not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { event, formData }: VerifyRequest = await req.json();

    console.log('Received reCAPTCHA verification request', {
      action: event.expectedAction,
      siteKey: event.siteKey,
      formEmail: formData.email ? '***@' + formData.email.split('@')[1] : 'not provided',
    });

    // Validate expected action matches
    if (event.expectedAction !== EXPECTED_ACTION) {
      console.warn('Action mismatch', { received: event.expectedAction, expected: EXPECTED_ACTION });
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid action' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the token with Google
    const verifyUrl = 'https://www.google.com/recaptcha/api/siteverify';
    const verifyResponse = await fetch(verifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: RECAPTCHA_SECRET_KEY,
        response: event.token,
      }),
    });

    const verifyData: RecaptchaVerifyResponse = await verifyResponse.json();

    console.log('reCAPTCHA verification response', {
      success: verifyData.success,
      score: verifyData.score,
      action: verifyData.action,
      hostname: verifyData.hostname,
      errors: verifyData['error-codes'],
    });

    // Check verification success
    if (!verifyData.success) {
      console.warn('reCAPTCHA verification failed', { errors: verifyData['error-codes'] });
      return new Response(
        JSON.stringify({ success: false, error: 'Verification failed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check action matches
    if (verifyData.action !== EXPECTED_ACTION) {
      console.warn('Action mismatch from Google', { received: verifyData.action, expected: EXPECTED_ACTION });
      return new Response(
        JSON.stringify({ success: false, error: 'Action mismatch' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check score threshold
    if (typeof verifyData.score === 'number' && verifyData.score < SCORE_THRESHOLD) {
      console.warn('Score below threshold', { score: verifyData.score, threshold: SCORE_THRESHOLD });
      return new Response(
        JSON.stringify({ success: false, error: 'Score too low' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // All checks passed - form submission is valid
    console.log('reCAPTCHA verification passed', {
      score: verifyData.score,
      hostname: verifyData.hostname,
    });

    // Here you would typically process the form data (save to database, send email, etc.)
    // For now, we just return success
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Form submitted successfully',
        score: verifyData.score 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verify-recaptcha function:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
