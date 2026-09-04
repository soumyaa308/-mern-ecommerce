import { useState } from "react";
import toast from "react-hot-toast";
import { FiMail, FiPhone, FiMapPin } from "react-icons/fi";

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);
    // No backend endpoint for contact messages yet ? this simulates submission.
    // Wire this to a real /api/contact endpoint + email notification when needed.
    setTimeout(() => {
      toast.success("Message sent! We'll get back to you soon.");
      setForm({ name: "", email: "", message: "" });
      setSubmitting(false);
    }, 600);
  };

  return (
    <div className="container-app py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-3xl font-bold">Get in Touch</h1>
        <p className="mt-2 text-gray-500">Have a question about an order or a product? We're happy to help.</p>
      </div>

      <div className="mx-auto mt-12 grid max-w-4xl grid-cols-1 gap-10 md:grid-cols-3">
        <div className="space-y-6 md:col-span-1">
          <div className="flex items-start gap-3">
            <FiMail className="mt-1 text-brand-600" />
            <div>
              <p className="text-sm font-medium">Email</p>
              <p className="text-sm text-gray-500">support@mernshop.com</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <FiPhone className="mt-1 text-brand-600" />
            <div>
              <p className="text-sm font-medium">Phone</p>
              <p className="text-sm text-gray-500">+91 98765 43210</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <FiMapPin className="mt-1 text-brand-600" />
            <div>
              <p className="text-sm font-medium">Address</p>
              <p className="text-sm text-gray-500">Pune, Maharashtra, India</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4 p-6 md:col-span-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Name</label>
            <input
              name="name"
              required
              value={form.name}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              name="email"
              required
              value={form.email}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Message</label>
            <textarea
              name="message"
              required
              rows={5}
              value={form.message}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          </div>
          <button type="submit" disabled={submitting} className="btn-primary w-full">
            {submitting ? "Sending..." : "Send Message"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Contact;