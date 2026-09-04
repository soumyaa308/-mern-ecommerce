/**
 * Dynamically loads Razorpay's checkout widget script, only once.
 * Resolves true on success, false if it fails to load (e.g. offline).
 */
let scriptPromise = null;

export const loadRazorpayScript = () => {
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve) => {
    if (document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]')) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

  return scriptPromise;
};