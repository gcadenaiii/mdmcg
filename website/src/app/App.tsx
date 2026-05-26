import { useState, useEffect } from "react";
import { motion, useScroll, useTransform } from "motion/react";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import logoImage from "../imports/Logo_-_Primary_Lockup.png";
import brandedDevice from "../imports/branded_device_realistic_-_Edited.png";
import ecgLineImage from "../imports/ECG_pulse_line_full_width_of_intro_section_-_Edited-2.png";
import lifestyleImage from "../imports/download__13_.png";
import postOpImage from "../imports/download__14_.png";
import layerDiagram from "../imports/download__6_.png";
import explodedLayers from "../imports/download__7_.png";
import deviceCrossSection from "../imports/exploded_diagram_device.png";
import sensingConcept from "../imports/sensing_concept.png";
import placementDiagram from "../imports/placement_diagram.png";
import farshidImage from "../imports/Farshid.jfif";
import georgeImage from "../imports/George.jpg";
import mahshidImage from "../imports/mahshid.jfif";

export default function App() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [referencesExpanded, setReferencesExpanded] = useState(false);
  const [formData, setFormData] = useState({
    fullName: "",
    organization: "",
    programType: "",
    email: "",
    message: ""
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const { scrollY } = useScroll();
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 300], [1, 0.95]);
  const deviceY = useTransform(scrollY, [0, 500], [0, -50]);
  const deviceRotate = useTransform(scrollY, [0, 500], [0, -5]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () =>
      window.removeEventListener("scroll", handleScroll);
  }, []);

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: Record<string, string> = {};

    if (!formData.fullName.trim()) {
      errors.fullName = "Name is required";
    }
    if (!formData.organization.trim()) {
      errors.organization = "Organization is required";
    }
    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      errors.email = "Please enter a valid email";
    }
    if (!formData.message.trim()) {
      errors.message = "Please tell us about your program";
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-white text-foreground">
      {/* Navigation */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled ? "bg-white/98 backdrop-blur-xl shadow-sm" : "bg-white"} border-b border-gray-200/60`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex items-center justify-between">
          <div
            className="text-3xl sm:text-4xl lg:text-5xl tracking-tight"
            style={{
              fontFamily: "Hind, sans-serif",
              fontWeight: 300,
              letterSpacing: "-0.03em",
            }}
          >
            mdmcg
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-10 text-sm font-light tracking-wide">
            <a
              href="#technology"
              onClick={(e) => { e.preventDefault(); document.getElementById('technology')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="hover:text-accent transition-colors cursor-pointer"
            >
              Technology
            </a>
            <a
              href="#science-mcg"
              onClick={(e) => { e.preventDefault(); document.getElementById('science-mcg')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="hover:text-accent transition-colors cursor-pointer"
            >
              The Science
            </a>
            <a
              href="#intelligence"
              onClick={(e) => { e.preventDefault(); document.getElementById('intelligence')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="hover:text-accent transition-colors cursor-pointer"
            >
              Intelligence
            </a>
            <a
              href="#clinical"
              onClick={(e) => { e.preventDefault(); document.getElementById('clinical')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="hover:text-accent transition-colors cursor-pointer"
            >
              Clinical
            </a>
            <a
              href="#team"
              onClick={(e) => { e.preventDefault(); document.getElementById('team')?.scrollIntoView({ behavior: 'smooth' }); }}
              className="hover:text-accent transition-colors cursor-pointer"
            >
              Team
            </a>
          </div>

          <div className="hidden md:block">
            <button
              onClick={() => document.getElementById('partners')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-accent text-white px-6 py-2.5 rounded-full hover:shadow-lg hover:scale-105 transition-all text-sm cursor-pointer"
            >
              Partners
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-3 hover:bg-accent/10 rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        <motion.div
          className="md:hidden bg-white border-t border-gray-200/60"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: mobileMenuOpen ? 'auto' : 0, opacity: mobileMenuOpen ? 1 : 0 }}
          transition={{ duration: 0.3 }}
          style={{ overflow: 'hidden' }}
        >
          <div className="px-8 py-6 space-y-4">
            <a
              href="#technology"
              onClick={(e) => { e.preventDefault(); document.getElementById('technology')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }}
              className="block py-2 hover:text-accent transition-colors cursor-pointer font-light"
            >
              Technology
            </a>
            <a
              href="#science-mcg"
              onClick={(e) => { e.preventDefault(); document.getElementById('science-mcg')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }}
              className="block py-2 hover:text-accent transition-colors cursor-pointer font-light"
            >
              The Science
            </a>
            <a
              href="#intelligence"
              onClick={(e) => { e.preventDefault(); document.getElementById('intelligence')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }}
              className="block py-2 hover:text-accent transition-colors cursor-pointer font-light"
            >
              Intelligence
            </a>
            <a
              href="#clinical"
              onClick={(e) => { e.preventDefault(); document.getElementById('clinical')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }}
              className="block py-2 hover:text-accent transition-colors cursor-pointer font-light"
            >
              Clinical
            </a>
            <a
              href="#team"
              onClick={(e) => { e.preventDefault(); document.getElementById('team')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }}
              className="block py-2 hover:text-accent transition-colors cursor-pointer font-light"
            >
              Team
            </a>
            <button
              onClick={() => { document.getElementById('partners')?.scrollIntoView({ behavior: 'smooth' }); setMobileMenuOpen(false); }}
              className="w-full bg-accent text-white px-6 py-3 rounded-full hover:shadow-lg transition-all text-sm mt-4"
            >
              Partners
            </button>
          </div>
        </motion.div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-white pt-16 sm:pt-20">
        {/* Layer 1: Subtle Gradient Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.03] via-white to-accent/[0.02]"></div>

        {/* Layer 2: Abstract Circular Shapes - Echoing Device Form */}
        <motion.div
          className="absolute top-1/4 right-1/4 w-[600px] h-[600px] bg-accent/[0.04] rounded-full blur-3xl pointer-events-none"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-accent/[0.03] rounded-full blur-3xl pointer-events-none"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.5, delay: 0.2, ease: "easeOut" }}
        />
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/[0.02] rounded-full blur-3xl pointer-events-none"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2, delay: 0.4, ease: "easeOut" }}
        />

        {/* Layer 3: Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16 lg:py-20 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-20 items-center">
            {/* Left Column - Text Content */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 1,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="inline-block px-4 py-1.5 bg-accent/10 text-accent rounded-full text-xs tracking-wider mb-8"
              >
                REVOLUTIONIZING CARDIAC MONITORING
              </motion.div>
              <h1 className="text-4xl sm:text-5xl lg:text-7xl mb-6 leading-[0.95] font-light tracking-tight">
                Your heart,
                <br />
                <span className="text-accent">
                  finally heard.
                </span>
              </h1>
              <p className="text-xl mb-10 text-foreground/70 font-light leading-relaxed max-w-lg">
                Clinical precision, human design.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <motion.button
                  className="bg-accent text-white px-6 sm:px-10 py-4 rounded-full hover:shadow-2xl transition-all shadow-lg relative overflow-hidden group w-full sm:w-auto"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="relative z-10">Request Access</span>
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-accent to-accent/80"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: 0 }}
                    transition={{ duration: 0.3 }}
                  />
                </motion.button>
                <motion.a
                  href="/platform/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-2 border-accent/20 text-accent px-6 sm:px-8 py-4 rounded-full hover:bg-accent hover:text-white hover:border-accent transition-all w-full sm:w-auto text-center"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                >
                  Explore the Platform
                </motion.a>
              </div>
            </motion.div>

            {/* Right Column - Device Image */}
            <motion.div
              className="relative flex items-center justify-center"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 1.2,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{ y: deviceY, rotate: deviceRotate }}
            >
              {/* Device Image */}
              <motion.div
                animate={{ y: [0, -15, 0] }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative"
              >
                <img
                  src={brandedDevice}
                  alt="MDMCG Device"
                  className="w-full h-auto drop-shadow-2xl"
                />
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="hidden md:block absolute bottom-10 left-1/2 -translate-x-1/2 z-20"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-6 h-10 border-2 border-accent/30 rounded-full flex justify-center pt-2">
            <motion.div
              className="w-1.5 h-1.5 bg-accent rounded-full"
              animate={{ y: [0, 12, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </motion.div>
      </section>

      {/* Lifestyle Section */}
      <section className="relative py-16 md:py-24 lg:py-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <motion.div
                className="relative rounded-3xl overflow-hidden shadow-2xl"
                whileHover={{ scale: 1.02, rotate: -0.5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <img
                  src={lifestyleImage}
                  alt="MDMCG in daily wear"
                  className="w-full h-auto"
                  loading="lazy"
                />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h2 className="text-3xl sm:text-4xl lg:text-5xl mb-6 font-light leading-tight">
                Lives in what
                <br />
                you already wear.
              </h2>
              <p className="text-lg text-foreground/70 font-light leading-relaxed">
                No adhesives. No wristband compromise. Worn naturally inside your clothing.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* The Gap: Problem Statement */}
      <section className="py-16 md:py-24 lg:py-32 bg-secondary">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-block px-6 py-2 bg-accent/10 text-accent rounded-full text-sm tracking-wider mb-8">
              THE MONITORING GAP
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-8 font-light leading-tight">
              The market learned to wear sensors.
              <br />
              <span className="text-accent">
                Clinical monitoring never caught up.
              </span>
            </h2>
            <p className="text-xl text-foreground/70 font-light leading-relaxed max-w-4xl mx-auto mb-8">
              Wristbands track steps. ECG patches diagnose
              rhythm. But the space between wellness and
              clinical-grade cardiac monitoring — daily,
              reusable, heart-centered — remained empty.
            </p>
            <p className="text-lg text-foreground/70 font-light max-w-3xl mx-auto mb-16">
              Hospital-grade MCG exists. Daily-wear MCG does not — until now.
            </p>
          </motion.div>

          {/* Category Positioning Map */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="mt-16 max-w-2xl mx-auto"
          >
            <svg viewBox="0 0 400 400" className="w-full h-auto">
              {/* Axes */}
              <line x1="40" y1="360" x2="380" y2="360" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />
              <line x1="40" y1="40" x2="40" y2="360" stroke="currentColor" strokeWidth="1.5" opacity="0.3" />

              {/* Axis labels */}
              <text x="200" y="390" textAnchor="middle" fontSize="12" fill="currentColor" opacity="0.6" fontWeight="300">Daily Wearability</text>
              <text x="15" y="200" textAnchor="middle" fontSize="12" fill="currentColor" opacity="0.6" fontWeight="300" transform="rotate(-90 15 200)">Signal Quality / Closeness to Heart</text>

              {/* Grid lines (subtle) */}
              <line x1="40" y1="200" x2="380" y2="200" stroke="currentColor" strokeWidth="0.5" opacity="0.1" strokeDasharray="4 4" />
              <line x1="210" y1="40" x2="210" y2="360" stroke="currentColor" strokeWidth="0.5" opacity="0.1" strokeDasharray="4 4" />

              {/* Data points */}
              {/* Wrist wearables: high wearability (320), low signal (280) */}
              <circle cx="320" cy="280" r="6" fill="#9CA3AF" opacity="0.6" />
              <text x="320" y="265" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.5" fontWeight="300">Wrist</text>

              {/* ECG patches: low wearability (140), high signal (100) */}
              <circle cx="140" cy="100" r="6" fill="#9CA3AF" opacity="0.6" />
              <text x="140" y="85" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.5" fontWeight="300">ECG Patches</text>

              {/* Hospital MCG: very low wearability (80), very high signal (60) */}
              <circle cx="80" cy="60" r="6" fill="#9CA3AF" opacity="0.6" />
              <text x="80" y="45" textAnchor="middle" fontSize="11" fill="currentColor" opacity="0.5" fontWeight="300">Hospital MCG</text>

              {/* MDMCG: high wearability (340), high signal (90) - enlarged and glowing */}
              <circle cx="340" cy="90" r="12" fill="#0E7C86" opacity="0.15" />
              <circle cx="340" cy="90" r="8" fill="#0E7C86" />
              <text x="340" y="70" textAnchor="middle" fontSize="12" fill="#0E7C86" fontWeight="500">MDMCG</text>
            </svg>

            <p className="text-center text-foreground/60 font-light text-sm mt-6 italic">
              Everyone else makes you choose. We don't.
            </p>
          </motion.div>
        </div>
      </section>

      {/* How It Works - Simplified */}
      <section id="technology" className="py-16 md:py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-6 font-light">
              How it works
            </h2>
            <p className="text-xl text-foreground/60 font-light max-w-3xl mx-auto">
              Credit card-sized precision. Eight MCG sensors.
              5mm total thickness.
            </p>
          </motion.div>

          {/* Simplified to 2 key visuals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-6xl mx-auto">
            {/* Left: The Technology */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -5, scale: 1.01 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="bg-gradient-to-br from-secondary to-white rounded-3xl p-6 md:p-10 shadow-xl hover:shadow-2xl cursor-default"
            >
              <motion.img
                src={sensingConcept}
                alt="MCG Sensor Array"
                className="w-full h-auto mb-6 md:mb-8 rounded-xl"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
                loading="lazy"
              />
              <h3 className="text-3xl mb-4 font-light">
                Over-heart sensing
              </h3>
              <p className="text-lg text-foreground/70 font-light leading-relaxed mb-6">
                A multi-sensor MCG array positioned directly
                over the cardiac apex — capturing magnetic field
                variations closer to the source than any wrist
                device.
              </p>
              <div className="flex items-center gap-3 text-accent">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="text-sm font-light">
                  86 mm × 54 mm × 5 mm
                </span>
              </div>
            </motion.div>

            {/* Right: The Integration */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              whileHover={{ y: -5, scale: 1.01 }}
              className="bg-gradient-to-br from-secondary to-white rounded-3xl p-6 md:p-10 shadow-xl hover:shadow-2xl cursor-default"
            >
              <motion.img
                src={placementDiagram}
                alt="Optimal Placement"
                className="w-full h-auto mb-6 md:mb-8 rounded-xl"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
                loading="lazy"
              />
              <h3 className="text-3xl mb-4 font-light">
                Worn naturally
              </h3>
              <p className="text-lg text-foreground/70 font-light leading-relaxed mb-6">
                Ultra-thin mesh retention zone inside your
                undershirt positions the pod in the optimal
                placement zone — same location, every time, no
                adhesives.
              </p>
              <div className="flex items-center gap-3 text-accent">
                <div className="w-2 h-2 bg-accent rounded-full"></div>
                <span className="text-sm font-light">
                  Breathable, washable, reusable
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* The MCG Advantage - NEW */}
      <section id="science-mcg" className="py-16 md:py-24 lg:py-32 bg-gradient-to-b from-white to-secondary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-block px-6 py-2 bg-accent/10 text-accent rounded-full text-sm tracking-wider mb-8">
              WHY MAGNETIC, NOT ELECTRICAL
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-6 font-light">
              The signal that skin can't blur.
            </h2>
            <p className="text-xl text-foreground/70 font-light leading-relaxed max-w-3xl mx-auto">
              Electrical heart signals get distorted by skin, muscle and fat on the way out. Magnetic fields pass straight through.
            </p>
          </motion.div>

          {/* Signal Comparison Diagram */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto mb-16"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white rounded-3xl p-8 md:p-12 shadow-lg">
              {/* Electrical Signal */}
              <div className="text-center">
                <h3 className="text-lg font-medium mb-6 text-foreground/60">Electrical Signal</h3>
                <svg viewBox="0 0 200 180" className="w-full h-auto mb-4">
                  {/* Tissue layers */}
                  <rect x="10" y="40" width="180" height="20" fill="#F3F4F6" />
                  <rect x="10" y="65" width="180" height="20" fill="#E5E7EB" />
                  <rect x="10" y="90" width="180" height="20" fill="#D1D5DB" />
                  <text x="100" y="55" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.4">Skin</text>
                  <text x="100" y="80" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.4">Fat</text>
                  <text x="100" y="105" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.4">Muscle</text>

                  {/* Distorted signal path */}
                  <path d="M 30 130 Q 50 115, 70 125 T 110 135 T 150 145 T 180 155" stroke="#9CA3AF" strokeWidth="2" fill="none" strokeDasharray="3 3" opacity="0.6" />
                  <text x="100" y="170" textAnchor="middle" fontSize="10" fill="currentColor" opacity="0.5" fontWeight="300">Distorted & weakened</text>
                </svg>
              </div>

              {/* Magnetic Signal */}
              <div className="text-center">
                <h3 className="text-lg font-medium mb-6 text-accent">Magnetic Signal</h3>
                <svg viewBox="0 0 200 180" className="w-full h-auto mb-4">
                  {/* Tissue layers (same) */}
                  <rect x="10" y="40" width="180" height="20" fill="#F3F4F6" />
                  <rect x="10" y="65" width="180" height="20" fill="#E5E7EB" />
                  <rect x="10" y="90" width="180" height="20" fill="#D1D5DB" />
                  <text x="100" y="55" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.4">Skin</text>
                  <text x="100" y="80" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.4">Fat</text>
                  <text x="100" y="105" textAnchor="middle" fontSize="8" fill="currentColor" opacity="0.4">Muscle</text>

                  {/* Clean signal path */}
                  <line x1="30" y1="130" x2="180" y2="130" stroke="#0E7C86" strokeWidth="2.5" />
                  <text x="100" y="170" textAnchor="middle" fontSize="10" fill="#0E7C86" fontWeight="400">Passes through unchanged</text>
                </svg>
              </div>
            </div>
          </motion.div>

          {/* Three Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto mb-12">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="bg-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all"
            >
              <h4 className="text-xl mb-3 font-medium">Undistorted by the body</h4>
              <p className="text-foreground/70 font-light leading-relaxed">
                Magnetic signals are not weakened by tissue, skin, or chest-wall thickness.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              whileHover={{ y: -5 }}
              className="bg-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all"
            >
              <h4 className="text-xl mb-3 font-medium">No contact required</h4>
              <p className="text-foreground/70 font-light leading-relaxed">
                Magnetic sensing needs no electrodes and tolerates a moving body — which is exactly why it can live in a shirt.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              whileHover={{ y: -5 }}
              className="bg-white p-6 md:p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all"
            >
              <h4 className="text-xl mb-3 font-medium">Higher resolution</h4>
              <p className="text-foreground/70 font-light leading-relaxed">
                A multi-sensor MCG array captures finer spatial detail than electrical leads.
              </p>
            </motion.div>
          </div>

          {/* Closing line */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <p className="text-xl text-accent font-light max-w-3xl mx-auto">
              Most cardiac sensors get worse when worn all day. MCG is the one that doesn't.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Your Personal Heart Model - NEW */}
      <section id="intelligence" className="py-16 md:py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <div className="inline-block px-6 py-2 bg-accent/10 text-accent rounded-full text-sm tracking-wider mb-8">
              INTELLIGENCE BUILT FOR ONE PERSON — YOU
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-6 font-light">
              A heart model that learns you.
            </h2>
            <p className="text-xl text-foreground/70 font-light leading-relaxed max-w-3xl mx-auto">
              Every heart has its own rhythm. MDMCG builds a private model of yours — then watches for what changes.
            </p>
          </motion.div>

          {/* Baseline Visualization */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-3xl mx-auto mb-16"
          >
            <div className="bg-gradient-to-br from-secondary to-white rounded-3xl p-8 md:p-12 shadow-lg">
              <svg viewBox="0 0 600 200" className="w-full h-auto">
                {/* Baseline band */}
                <rect x="50" y="80" width="500" height="40" fill="#0E7C86" opacity="0.1" rx="4" />
                <text x="300" y="75" textAnchor="middle" fontSize="12" fill="#0E7C86" fontWeight="400">Your baseline</text>

                {/* Signal line within baseline */}
                <path d="M 50 100 Q 100 95, 150 100 T 250 100 T 350 105 Q 400 125, 420 135 Q 440 125, 460 110 T 550 100" stroke="#0E7C86" strokeWidth="2" fill="none" />

                {/* Deviation marker */}
                <circle cx="420" cy="135" r="5" fill="#0E7C86" />
                <line x1="420" y1="145" x2="420" y2="165" stroke="#0E7C86" strokeWidth="1" strokeDasharray="2 2" />
                <text x="420" y="180" textAnchor="middle" fontSize="10" fill="#0E7C86" fontWeight="300">Change detected</text>
              </svg>
            </div>
          </motion.div>

          {/* Three Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 max-w-6xl mx-auto mb-16">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="bg-secondary p-6 md:p-8 rounded-2xl hover:shadow-lg transition-all"
            >
              <h4 className="text-xl mb-3 font-medium">Learns your baseline</h4>
              <p className="text-foreground/70 font-light leading-relaxed">
                Your model is trained on your heart, not a population average.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              whileHover={{ y: -5 }}
              className="bg-secondary p-6 md:p-8 rounded-2xl hover:shadow-lg transition-all"
            >
              <h4 className="text-xl mb-3 font-medium">Notices change early</h4>
              <p className="text-foreground/70 font-light leading-relaxed">
                It flags meaningful deviation from your norm — research on personalized cardiac models has surfaced warning signs days before a hospital visit.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              whileHover={{ y: -5 }}
              className="bg-secondary p-6 md:p-8 rounded-2xl hover:shadow-lg transition-all"
            >
              <h4 className="text-xl mb-3 font-medium">Works both ways</h4>
              <p className="text-foreground/70 font-light leading-relaxed">
                It catches early signs of decline, and confirms when recovery is trending the right way.
              </p>
            </motion.div>
          </div>

          {/* Health Score Block */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="max-w-5xl mx-auto bg-gradient-to-br from-accent/5 to-white border-2 border-accent/20 rounded-3xl p-8 md:p-12"
          >
            <h3 className="text-2xl sm:text-3xl mb-6 font-light text-center">
              The most honest Health Score starts with the cleanest signal.
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-foreground/70 font-light leading-relaxed mb-4">
                  Wrist scores estimate your heart from the wrist — far from the source, through motion and skin.
                </p>
                <p className="text-foreground/70 font-light leading-relaxed">
                  MDMCG listens over the heart. A cleaner signal in means a Health Score you can actually trust.
                </p>
              </div>

              {/* Signal Comparison */}
              <div className="bg-white rounded-2xl p-6">
                <svg viewBox="0 0 300 120" className="w-full h-auto">
                  {/* Wrist signal (noisy) */}
                  <text x="10" y="20" fontSize="10" fill="currentColor" opacity="0.5" fontWeight="300">Wrist (optical, distant)</text>
                  <path d="M 10 40 Q 20 35, 30 45 Q 40 55, 50 40 Q 60 30, 70 50 Q 80 60, 90 45 Q 100 35, 110 55 Q 120 65, 130 50 Q 140 40, 150 60 Q 160 70, 170 55 Q 180 45, 190 65 Q 200 75, 210 60 Q 220 50, 230 70 Q 240 80, 250 65 Q 260 55, 270 75 Q 280 85, 290 70" stroke="#9CA3AF" strokeWidth="1.5" fill="none" opacity="0.4" />

                  {/* MDMCG signal (clean) */}
                  <text x="10" y="90" fontSize="10" fill="#0E7C86" fontWeight="400">MDMCG (over-heart)</text>
                  <path d="M 10 110 Q 40 105, 80 110 Q 120 115, 160 110 Q 200 105, 240 110 Q 260 112, 290 110" stroke="#0E7C86" strokeWidth="2" fill="none" />
                </svg>
              </div>
            </div>

            <p className="text-center text-accent text-lg font-light">
              Better math can't fix a blurry signal. We started with a better signal.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Clinical Applications - Narrative Driven */}
      <section
        id="clinical"
        className="py-16 md:py-24 lg:py-32 relative overflow-hidden bg-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-block px-6 py-2 bg-accent/10 text-accent rounded-full text-sm tracking-wider mb-8">
              WHERE IT MATTERS MOST
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-6 font-light">
              The weeks between visits.
              <br />
              <span className="text-accent">
                When recovery continues at home.
              </span>
            </h2>
            <p className="text-xl text-foreground/60 font-light max-w-3xl mx-auto leading-relaxed">
              Clinical care doesn't end at discharge. MDMCG covers the weeks in between.
            </p>
          </motion.div>

          {/* Hero Use Case: Post-Op */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 items-center mb-12 md:mb-16 lg:mb-20 bg-gradient-to-br from-secondary to-white rounded-3xl p-6 lg:p-12">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <motion.div
                className="relative rounded-2xl overflow-hidden shadow-2xl"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <img
                  src={postOpImage}
                  alt="Post-operative monitoring"
                  className="w-full h-auto"
                  loading="lazy"
                />
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-sm text-accent mb-4 uppercase tracking-wider">
                Featured Application
              </div>
              <h3 className="text-4xl mb-6 font-light">
                Post-Surgery & Cardiac Rehab
              </h3>
              <p className="text-lg text-foreground/70 mb-6 font-light leading-relaxed">
                Discharge is a transition, not an ending. Track
                recovery trajectory, detect early warning signs,
                and maintain care team visibility — without
                requiring patients to return for routine
                monitoring.
              </p>

              {/* Key Benefits */}
              <div className="space-y-4 mb-8">
                <motion.div
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-accent/5 transition-colors cursor-default"
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="w-2 h-2 bg-accent rounded-full mt-2"></div>
                  <div>
                    <p className="font-normal mb-1">
                      Continuous visibility
                    </p>
                    <p className="text-sm text-foreground/60 font-light">
                      Heart trends captured 24/7, not just at
                      scheduled visits
                    </p>
                  </div>
                </motion.div>
                <motion.div
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-accent/5 transition-colors cursor-default"
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="w-2 h-2 bg-accent rounded-full mt-2"></div>
                  <div>
                    <p className="font-normal mb-1">
                      Earlier escalation signals
                    </p>
                    <p className="text-sm text-foreground/60 font-light">
                      Proactive intervention before symptoms
                      worsen
                    </p>
                  </div>
                </motion.div>
                <motion.div
                  className="flex items-start gap-3 p-3 rounded-xl hover:bg-accent/5 transition-colors cursor-default"
                  whileHover={{ x: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className="w-2 h-2 bg-accent rounded-full mt-2"></div>
                  <div>
                    <p className="font-normal mb-1">
                      Patient confidence
                    </p>
                    <p className="text-sm text-foreground/60 font-light">
                      Continuous reassurance during vulnerable
                      recovery period
                    </p>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          </div>

          {/* Other Applications */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-secondary p-6 md:p-8 rounded-2xl hover:shadow-xl transition-all cursor-default hover:bg-accent/5"
            >
              <motion.div
                className="mb-6"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <svg className="w-12 h-12 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </motion.div>
              <h4 className="text-xl mb-3 font-medium">
                Remote Patient Monitoring
              </h4>
              <p className="text-foreground/70 font-light leading-relaxed">
                Reusable hardware for chronic and acute programs — less friction, better compliance.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-secondary p-6 md:p-8 rounded-2xl hover:shadow-xl transition-all cursor-default hover:bg-accent/5"
            >
              <motion.div
                className="mb-6"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <svg className="w-12 h-12 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11h.01M9 11h.01" />
                </svg>
              </motion.div>
              <h4 className="text-xl mb-3 font-medium">
                Metabolic & Weight-Loss Recovery
              </h4>
              <p className="text-foreground/70 font-light leading-relaxed">
                Track cardiovascular trends through GLP-1 therapy and post-bariatric recovery.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="bg-secondary p-6 md:p-8 rounded-2xl hover:shadow-xl transition-all cursor-default hover:bg-accent/5"
            >
              <motion.div
                className="mb-6"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 400 }}
              >
                <svg className="w-12 h-12 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </motion.div>
              <h4 className="text-xl mb-3 font-medium">
                Athletic Training & Recovery
              </h4>
              <p className="text-foreground/70 font-light leading-relaxed">
                Chest-centered recovery and training-load data — not wrist approximations.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Science & Validation */}
      <section
        id="commitment"
        className="py-16 md:py-24 lg:py-32 bg-gradient-to-b from-white to-secondary"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="inline-block px-6 py-2 bg-accent/10 text-accent rounded-full text-sm tracking-wider mb-8">
              OUR COMMITMENT
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-8 font-light">
              Honest by design.
            </h2>
            <p className="text-xl text-foreground/70 mb-8 leading-relaxed font-light">
              We say "clinical-grade aspiration" — not
              "clinical-grade" — and we mean the difference.
            </p>
            <p className="text-lg text-foreground/60 mb-8 leading-relaxed font-light">
              MDMCG is built toward clinical validation,
              benchmarked against periodic ECG patch data as
              external ground truth. We'll make the claim when
              the evidence does. Until then, we're transparent
              about exactly where we are: a heart-centered
              platform designed for closer signal capture, on a
              defined path toward validation and
              remote-monitoring workflows.
            </p>
            <p className="text-lg text-foreground/60 mb-8 leading-relaxed font-light">
              AI models are validated against ECG ground truth, not just the sensor — the same discipline, applied to the software.
            </p>
            <div className="inline-block px-8 py-4 bg-accent/5 border-2 border-accent/20 rounded-2xl">
              <p className="text-accent text-lg font-light">
                The bridge between wellness wearables and
                clinically useful monitoring —
                <br />
                and the discipline to prove it.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Impact Story - Problem → Solution Flow */}
      <section className="py-16 md:py-24 lg:py-32 relative overflow-hidden bg-primary text-white">
        {/* Decorative ECG pattern */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${ecgLineImage})`,
              backgroundSize: "200% auto",
              backgroundPosition: "center",
              backgroundRepeat: "repeat-x",
            }}
          ></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            {/* The Problem */}
            <div className="inline-block mb-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="absolute inset-0 bg-white/10 blur-3xl"></div>
                <h2 className="text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-light relative z-10 tracking-tight">
                  1 in 3
                </h2>
              </motion.div>
            </div>

            <p className="text-xl sm:text-2xl md:text-3xl lg:text-4xl mb-6 font-light max-w-4xl mx-auto leading-tight">
              Cardiovascular disease causes one in three deaths
              in the U.S.
            </p>

            <p className="text-xl text-white/70 font-light max-w-3xl mx-auto leading-relaxed">
              The most expensive condition in American
              healthcare — yet the least continuously monitored
              between clinic visits.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Founders Section */}
      <section id="team" className="py-16 md:py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-20"
          >
            <div className="inline-block px-6 py-2 bg-accent/10 text-accent rounded-full text-sm tracking-wider mb-8">
              LEADERSHIP
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-6 font-light">
              Built by inventors.
            </h2>
            <p className="text-xl text-foreground/70 font-light leading-relaxed max-w-3xl mx-auto">
              Founded by a team from Caltech.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {/* Farshid Roumi */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-gradient-to-br from-secondary to-white rounded-3xl p-6 md:p-8 hover:shadow-xl transition-all"
            >
              <motion.div
                className="mb-6"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <img
                  src={farshidImage}
                  alt="Farshid Roumi"
                  className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-accent/10"
                  loading="lazy"
                  decoding="async"
                />
              </motion.div>
              <h3 className="text-2xl mb-2 font-light text-center">Farshid Roumi</h3>
              <div className="text-center mb-6">
                <span className="text-sm text-foreground/50 font-light">Co-Founder</span>
              </div>
              <div className="text-sm text-foreground/70 font-light leading-relaxed text-center space-y-2">
                <p>Founder & CEO of Parthian Energy, developing next-generation energy-storage systems for electric vehicles.</p>
                <p>Ph.D. in Mechanical Engineering from Caltech; inventor of 42 published patents in science and engineering.</p>
                <p>Former Principal Investigator at Caltech and four-time recipient of the Caltech Innovation Initiative award.</p>
                <p>National Academy of Engineering Frontiers of Engineering selectee, 2023 — one of 81 early-career engineers nationwide.</p>
              </div>
            </motion.div>

            {/* George Cadena */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-secondary to-white rounded-3xl p-6 md:p-8 hover:shadow-xl transition-all"
            >
              <motion.div
                className="mb-6"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <img
                  src={georgeImage}
                  alt="George Cadena"
                  className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-accent/10"
                  loading="lazy"
                  decoding="async"
                />
              </motion.div>
              <h3 className="text-2xl mb-2 font-light text-center">George Cadena</h3>
              <div className="text-center mb-6">
                <span className="text-sm text-foreground/50 font-light">Co-Founder</span>
              </div>
              <div className="text-sm text-foreground/70 font-light leading-relaxed text-center space-y-2">
                <p>Engineering leader with 15+ years taking products from concept to market across software, hardware, and regulated medical devices.</p>
                <p>Inventor of a wearable multi-lead ECG patch (US-D972736-S); led the company through FDA audit and ISO 13485 certification.</p>
                <p>Director at ShotSpotter, leading end-to-end delivery of weapons-detection systems for multi-lane commercial deployment. M.S. Electrical Engineering, Caltech.</p>
              </div>
            </motion.div>

            {/* Mahshid Roumi */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-secondary to-white rounded-3xl p-6 md:p-8 hover:shadow-xl transition-all"
            >
              <motion.div
                className="mb-6"
                whileHover={{ scale: 1.05 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <img
                  src={mahshidImage}
                  alt="Mahshid Roumi"
                  className="w-32 h-32 rounded-full mx-auto object-cover border-4 border-accent/10"
                  loading="lazy"
                  decoding="async"
                />
              </motion.div>
              <h3 className="text-2xl mb-2 font-light text-center">Mahshid Roumi</h3>
              <div className="text-center mb-6">
                <span className="text-sm text-foreground/50 font-light">Co-Founder</span>
              </div>
              <div className="text-sm text-foreground/70 font-light leading-relaxed text-center space-y-2">
                <p>Co-Founder & VP of Product Development at Parthian Energy, leading deep-tech energy-storage product development.</p>
                <p>Ph.D. in Electrical & Computer Engineering from UC Irvine; 10+ years commercializing research into market-ready products.</p>
                <p>Former Postdoctoral Scholar at Caltech.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Partnership CTA */}
      <section
        id="partners"
        className="py-16 md:py-24 lg:py-32 bg-gradient-to-b from-secondary to-white"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl mb-6 font-light">
              Partner with pioneers.
            </h2>
            <p className="text-xl text-foreground/70 font-light leading-relaxed">
              We're collaborating with select healthcare and
              performance programs to validate signal quality,
              wearability, and clinical value.
            </p>
          </motion.div>

{formSubmitted ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="bg-white p-6 md:p-10 rounded-3xl shadow-2xl text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="w-20 h-20 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <h3 className="text-3xl mb-4 font-light">Thank you for your interest!</h3>
              <p className="text-lg text-foreground/70 font-light mb-8 leading-relaxed">
                We've received your partnership inquiry and will reach out within 2 business days to discuss how MDMCG can support your program.
              </p>
              <motion.button
                onClick={() => {
                  setFormSubmitted(false);
                  setFormData({ fullName: "", organization: "", programType: "", email: "", message: "" });
                }}
                className="text-accent hover:text-accent/80 font-light transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Submit another inquiry
              </motion.button>
            </motion.div>
          ) : (
            <motion.form
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              onSubmit={handleSubmit}
              className="bg-white p-6 md:p-10 rounded-3xl shadow-2xl space-y-6"
            >
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm mb-2 font-normal text-foreground/70">
                    Full Name <span className="text-accent">*</span>
                  </label>
                  <motion.input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    className={`w-full px-5 py-4 bg-secondary/50 rounded-xl border ${
                      formErrors.fullName ? "border-destructive" : "border-border"
                    } focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all font-light`}
                    placeholder="Dr. Jane Smith"
                    whileFocus={{ scale: 1.01 }}
                  />
                  {formErrors.fullName && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-destructive mt-1"
                    >
                      {formErrors.fullName}
                    </motion.p>
                  )}
                </div>
                <div>
                  <label className="block text-sm mb-2 font-normal text-foreground/70">
                    Organization <span className="text-accent">*</span>
                  </label>
                  <motion.input
                    type="text"
                    name="organization"
                    value={formData.organization}
                    onChange={handleInputChange}
                    className={`w-full px-5 py-4 bg-secondary/50 rounded-xl border ${
                      formErrors.organization ? "border-destructive" : "border-border"
                    } focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all font-light`}
                    placeholder="Research Hospital"
                    whileFocus={{ scale: 1.01 }}
                  />
                  {formErrors.organization && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-destructive mt-1"
                    >
                      {formErrors.organization}
                    </motion.p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm mb-2 font-normal text-foreground/70">
                    Program Type
                  </label>
                  <motion.input
                    type="text"
                    name="programType"
                    value={formData.programType}
                    onChange={handleInputChange}
                    className="w-full px-5 py-4 bg-secondary/50 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all font-light"
                    placeholder="Cardiac Rehab"
                    whileFocus={{ scale: 1.01 }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 font-normal text-foreground/70">
                    Email Address <span className="text-accent">*</span>
                  </label>
                  <motion.input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`w-full px-5 py-4 bg-secondary/50 rounded-xl border ${
                      formErrors.email ? "border-destructive" : "border-border"
                    } focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all font-light`}
                    placeholder="jane@hospital.com"
                    whileFocus={{ scale: 1.01 }}
                  />
                  {formErrors.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-destructive mt-1"
                    >
                      {formErrors.email}
                    </motion.p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 font-normal text-foreground/70">
                  Tell us about your program <span className="text-accent">*</span>
                </label>
                <motion.textarea
                  rows={4}
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  className={`w-full px-5 py-4 bg-secondary/50 rounded-xl border ${
                    formErrors.message ? "border-destructive" : "border-border"
                  } focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all font-light resize-none`}
                  placeholder="Describe your monitoring needs and patient population..."
                  whileFocus={{ scale: 1.01 }}
                />
                {formErrors.message && (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-destructive mt-1"
                  >
                    {formErrors.message}
                  </motion.p>
                )}
              </div>

              <motion.button
                type="submit"
                className="w-full bg-accent text-white px-8 py-5 rounded-full hover:shadow-xl transition-all text-lg font-normal relative overflow-hidden group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="relative z-10">Request Partnership Discussion</span>
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-accent to-accent/80"
                  initial={{ x: '-100%' }}
                  whileHover={{ x: 0 }}
                  transition={{ duration: 0.3 }}
                />
              </motion.button>
            </motion.form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 md:py-20 px-4 sm:px-6 lg:px-8 bg-primary text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12">
            <div className="md:col-span-2">
              <div
                className="text-3xl mb-4 tracking-tight"
                style={{
                  fontFamily: "Hind, sans-serif",
                  fontWeight: 300,
                  letterSpacing: "-0.02em",
                }}
              >
                mdmcg
              </div>
              <p className="text-white/70 font-light leading-relaxed mb-6">
                Everyday heart monitoring, designed for clinical
                use. Bridging wellness wearables and
                clinical-grade cardiac monitoring.
              </p>
              <div className="flex gap-4">
                <motion.a
                  href="#"
                  className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <span className="sr-only">LinkedIn</span>
                  <svg
                    className="w-5 h-5"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                  </svg>
                </motion.a>
              </div>
            </div>

            <div>
              <h4 className="font-normal mb-4">Platform</h4>
              <ul className="space-y-2 text-sm text-white/70 font-light">
                <li>
                  <a
                    href="#technology"
                    onClick={(e) => { e.preventDefault(); document.getElementById('technology')?.scrollIntoView({ behavior: 'smooth' }); }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Technology
                  </a>
                </li>
                <li>
                  <a
                    href="#science-mcg"
                    onClick={(e) => { e.preventDefault(); document.getElementById('science-mcg')?.scrollIntoView({ behavior: 'smooth' }); }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    The Science
                  </a>
                </li>
                <li>
                  <a
                    href="#intelligence"
                    onClick={(e) => { e.preventDefault(); document.getElementById('intelligence')?.scrollIntoView({ behavior: 'smooth' }); }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Intelligence
                  </a>
                </li>
                <li>
                  <a
                    href="#clinical"
                    onClick={(e) => { e.preventDefault(); document.getElementById('clinical')?.scrollIntoView({ behavior: 'smooth' }); }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Clinical
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-normal mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-white/70 font-light">
                <li>
                  <a
                    href="#team"
                    onClick={(e) => { e.preventDefault(); document.getElementById('team')?.scrollIntoView({ behavior: 'smooth' }); }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Team
                  </a>
                </li>
                <li>
                  <a
                    href="#partners"
                    onClick={(e) => { e.preventDefault(); document.getElementById('partners')?.scrollIntoView({ behavior: 'smooth' }); }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Partners
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 space-y-4">
            <p className="text-xs text-white/50 font-light">
              Investigational device. Not yet FDA cleared.
              "Clinical-grade" performance is aspirational
              pending validation and regulatory review.
            </p>
            <p className="text-xs text-white/40 font-light">
              Market context: CDC Heart Disease Facts · CMS
              Remote Patient Monitoring · FDA General Wellness
              Guidance.
            </p>

            {/* Science References - Collapsible */}
            <div className="pt-2">
              <button
                onClick={() => setReferencesExpanded(!referencesExpanded)}
                className="text-xs text-white/40 hover:text-white/60 font-light transition-colors flex items-center gap-2"
              >
                <span>Science references</span>
                <motion.svg
                  className="w-3 h-3"
                  animate={{ rotate: referencesExpanded ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>

              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{
                  height: referencesExpanded ? 'auto' : 0,
                  opacity: referencesExpanded ? 1 : 0
                }}
                transition={{ duration: 0.3 }}
                style={{ overflow: 'hidden' }}
                className="text-xs text-white/30 font-light mt-2 space-y-1"
              >
                <p>1. MCG signal advantages and contactless sensing: peer-reviewed cardiology literature on magnetocardiography and non-contact cardiac monitoring.</p>
                <p>2. Personalized wearable models and early-warning lead time: heart-failure monitoring studies on individualized baseline modeling and deviation detection.</p>
                <p>3. CDC Heart Disease Facts: cardiovascular disease as leading cause of death globally.</p>
                <p>4. CMS Remote Patient Monitoring: Centers for Medicare & Medicaid Services guidance on RPM programs.</p>
                <p>5. FDA General Wellness Guidance: regulatory framework for wellness and general health devices.</p>
              </motion.div>
            </div>

            <p className="text-xs text-white/40 font-light">
              © 2026 MDMCG. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}