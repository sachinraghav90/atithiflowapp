import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import TopRibbon from "@/components/layout/TopRibbon";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { NativeSelect } from "@/components/ui/native-select";
// Edge function URL for reCAPTCHA verification
const VERIFY_RECAPTCHA_URL = `${import.meta.env.VITE_SUPABASE_URL || ''}/functions/v1/verify-recaptcha`;
import { Mail, Phone, MapPin, ArrowRight } from "lucide-react";

const RECAPTCHA_SITE_KEY = "6LfRRwQsAAAAAKjMFCqSdimJabCnVGgPM1m7fVJJ";
const RECAPTCHA_ACTION = "contact_submit";

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

const modules = [
  { id: "reservations", label: "Reservations & Channel Management" },
  { id: "front-office", label: "Front Office" },
  { id: "housekeeping", label: "Housekeeping" },
  { id: "fnb", label: "F&B & Dining" },
  { id: "analytics", label: "Analytics & Reporting" },
  { id: "integrations", label: "Integrations" },
];

const Contact = () => {
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (location.hash) {
      const element = document.getElementById(location.hash.slice(1));
      if (element) {
        setTimeout(() => {
          element.scrollIntoView({ behavior: "instant", block: "start" });
        }, 0);
      }
    }
  }, [location]);
  // Load reCAPTCHA script
  useEffect(() => {
    const scriptId = 'recaptcha-v3-script';
    if (document.getElementById(scriptId)) return;

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount if needed
    };
  }, []);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    hotelName: "",
    propertySize: "",
    country: "",
    message: "",
    selectedModules: [] as string[],
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recaptchaError, setRecaptchaError] = useState<string | null>(null);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleModuleChange = (moduleId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      selectedModules: checked
        ? [...prev.selectedModules, moduleId]
        : prev.selectedModules.filter((id) => id !== moduleId),
    }));
  };

  const getRecaptchaToken = useCallback(async (): Promise<string | null> => {
    try {
      return new Promise((resolve) => {
        if (window.grecaptcha) {
          window.grecaptcha.ready(async () => {
            try {
              const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, {
                action: RECAPTCHA_ACTION,
              });
              resolve(token);
            } catch (error) {
              console.error('reCAPTCHA execute error:', error);
              resolve(null);
            }
          });
        } else {
          console.error('reCAPTCHA not loaded');
          resolve(null);
        }
      });
    } catch (error) {
      console.error('reCAPTCHA error:', error);
      return null;
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setRecaptchaError(null);

    try {
      // Get reCAPTCHA token
      const token = await getRecaptchaToken();
      
      if (!token) {
        setRecaptchaError("We couldn't verify your request. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Submit to edge function for verification
      const response = await fetch(VERIFY_RECAPTCHA_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event: {
            token,
            expectedAction: RECAPTCHA_ACTION,
            siteKey: RECAPTCHA_SITE_KEY,
          },
          formData: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            hotelName: formData.hotelName,
            propertySize: formData.propertySize,
            country: formData.country,
            message: formData.message,
            selectedModules: formData.selectedModules,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setRecaptchaError("We couldn't verify your request. Please try again.");
        setIsSubmitting(false);
        return;
      }

      toast({
        title: "Demo request submitted",
        description: "We'll be in touch within 24 hours to schedule your personalized demo.",
      });

      setFormData({
        name: "",
        email: "",
        phone: "",
        hotelName: "",
        propertySize: "",
        country: "",
        message: "",
        selectedModules: [],
      });
    } catch (error) {
      console.error('Form submission error:', error);
      setRecaptchaError("We couldn't verify your request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <TopRibbon />
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section id="hero" className="py-16 bg-white scroll-mt-20">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground">
              Book your personalized demo
            </h1>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Get a tailored walkthrough of AtithiFlow designed for your property. No obligation, just a conversation about how we can help.
            </p>
          </div>
        </section>

        {/* Form Section */}
        <section className="py-12 bg-muted">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-3 gap-12">
              {/* Contact Info */}
              <div className="lg:col-span-1">
                <h2 className="text-2xl font-bold text-foreground mb-6">
                  Get in touch
                </h2>
                <p className="text-muted-foreground mb-8">
                  Have questions? Our team is here to help you find the right solution for your property.
                </p>
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Email</p>
                      <a 
                        href="mailto:support@atithiflow.com" 
                        className="relative inline-block text-muted-foreground hover:text-primary focus-visible:text-primary transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-primary after:origin-center after:scale-x-0 hover:after:scale-x-100 focus-visible:after:scale-x-100 after:transition-transform after:duration-200 after:ease-out motion-reduce:after:transition-none motion-reduce:hover:after:scale-x-100"
                      >
                        support@atithiflow.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Phone</p>
                      <a 
                        href="tel:+918562882887" 
                        className="relative inline-block text-muted-foreground hover:text-primary focus-visible:text-primary transition-colors duration-200 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-full after:h-[2px] after:bg-primary after:origin-center after:scale-x-0 hover:after:scale-x-100 focus-visible:after:scale-x-100 after:transition-transform after:duration-200 after:ease-out motion-reduce:after:transition-none motion-reduce:hover:after:scale-x-100"
                      >
                        +91 85628 82887
                      </a>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Location</p>
                      <p className="text-muted-foreground">Global operations</p>
                    </div>
                  </div>
                </div>

                {/* Already a customer? */}
                <div className="mt-12 p-6 bg-card rounded-[3px] border border-border">
                  <h3 className="font-semibold text-foreground mb-2">Already a customer?</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Visit our Help Center or contact your dedicated support representative.
                  </p>
                  <a href="#" className="text-primary text-sm font-medium hover:underline">
                    Go to Help Center →
                  </a>
                </div>
              </div>

              {/* Form */}
              <div className="lg:col-span-2">
                <form onSubmit={handleSubmit} className="bg-card p-8 rounded-[5px] border border-border">
                  <h2 className="text-xl font-bold text-foreground mb-6">
                    Request a demo
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        placeholder="Your full name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Work email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        placeholder="you@company.com"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone (optional)</Label>
                      <Input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="+1 (234) 567-890"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hotelName">Hotel / Property name *</Label>
                      <Input
                        id="hotelName"
                        name="hotelName"
                        value={formData.hotelName}
                        onChange={handleInputChange}
                        required
                        placeholder="Your property name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="propertySize">Property size</Label>
                      <NativeSelect
                        id="propertySize"
                        name="propertySize"
                        value={formData.propertySize}
                        onChange={handleInputChange}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        <option value="">Select size</option>
                        <option value="1-25">1-25 rooms</option>
                        <option value="26-50">26-50 rooms</option>
                        <option value="51-100">51-100 rooms</option>
                        <option value="101-250">101-250 rooms</option>
                        <option value="250+">250+ rooms</option>
                        <option value="multi">Multiple properties</option>
                      </NativeSelect>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country">Country / Region</Label>
                      <Input
                        id="country"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        placeholder="Your country"
                      />
                    </div>
                  </div>

                  <div className="mt-6 space-y-2">
                    <Label>Modules of interest</Label>
                    <div className="grid sm:grid-cols-2 gap-3 mt-3">
                      {modules.map((module) => (
                        <div key={module.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={module.id}
                            checked={formData.selectedModules.includes(module.id)}
                            onCheckedChange={(checked) =>
                              handleModuleChange(module.id, checked as boolean)
                            }
                          />
                          <label
                            htmlFor={module.id}
                            className="text-sm text-foreground cursor-pointer"
                          >
                            {module.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 space-y-2">
                    <Label htmlFor="message">Message / Requirements</Label>
                    <Textarea
                      id="message"
                      name="message"
                      value={formData.message}
                      onChange={handleInputChange}
                      placeholder="Tell us about your property and what you're looking to achieve..."
                      rows={4}
                    />
                  </div>

                  {recaptchaError && (
                    <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                      <p className="text-sm text-destructive">{recaptchaError}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    variant="hero"
                    size="xl"
                    className="w-full mt-8"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Request Demo"}
                    {!isSubmitting && <ArrowRight className="ml-2 h-5 w-5" />}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;

