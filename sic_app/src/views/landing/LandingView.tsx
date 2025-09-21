import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Zap,
  Brain,
  Clock,
  TrendingUp,
  ShieldCheck,
  BarChart3,
  ArrowRight,
  CheckCircle,
  Play,
  Check,
  Crown,
  Users,
  Target,
  Award,
  Mail,
  Phone,
  MapPin,
  Send,
  Menu,
  X,
  Heart,
  Globe,
  MessageCircle,
  Instagram,
  Facebook,
  Linkedin,
  Star,
  Quote
} from 'lucide-react'
import { useScrollAnimation } from '@/hooks/useScrollAnimation'
import { useTheme } from '@/lib/theme'
import { ThemeToggle } from '@/components/ThemeToggle'
import { cn } from '@/lib/utils'

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 }
}

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 }
}

export function LandingView() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { resolvedTheme } = useTheme()

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
    setMobileMenuOpen(false)
  }

  const heroAnimation = useScrollAnimation()
  const featuresAnimation = useScrollAnimation()
  const testimonialsAnimation = useScrollAnimation()
  const pricingAnimation = useScrollAnimation()
  const aboutAnimation = useScrollAnimation()
  const contactAnimation = useScrollAnimation()
  const ctaAnimation = useScrollAnimation()

  return (
    <div className={cn(
      "min-h-screen relative overflow-hidden transition-colors duration-300",
      resolvedTheme === 'dark' ? 'bg-gray-950' : 'bg-white'
    )}>
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br transition-colors duration-300",
          resolvedTheme === 'dark'
            ? 'from-purple-900/20 via-blue-900/20 to-indigo-900/20'
            : 'from-purple-100/30 via-blue-100/30 to-indigo-100/30'
        )} />
        <motion.div
          className={cn(
            "absolute top-0 left-1/4 w-96 h-96 rounded-full mix-blend-multiply filter blur-xl transition-colors duration-300",
            resolvedTheme === 'dark' ? 'bg-purple-500/10' : 'bg-purple-200/20'
          )}
          animate={{
            y: [0, -20, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className={cn(
            "absolute top-1/2 right-1/4 w-96 h-96 rounded-full mix-blend-multiply filter blur-xl transition-colors duration-300",
            resolvedTheme === 'dark' ? 'bg-blue-500/10' : 'bg-blue-200/20'
          )}
          animate={{
            y: [0, -20, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 2
          }}
        />
        <motion.div
          className={cn(
            "absolute bottom-0 left-1/3 w-96 h-96 rounded-full mix-blend-multiply filter blur-xl transition-colors duration-300",
            resolvedTheme === 'dark' ? 'bg-indigo-500/10' : 'bg-indigo-200/20'
          )}
          animate={{
            y: [0, -20, 0],
            scale: [1, 1.05, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 4
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 backdrop-blur-sm sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <motion.div
              className="flex items-center gap-3"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Zap className={cn("h-8 w-8", resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900')} />
              <span className={cn("text-2xl font-bold", resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900')}>DueSpark</span>
            </motion.div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <ThemeToggle />
              {['features', 'testimonials', 'pricing', 'about', 'contact'].map((item, index) => (
                <motion.button
                  key={item}
                  onClick={() => scrollToSection(item)}
                  className={cn(
                    "transition-colors duration-200 capitalize",
                    resolvedTheme === 'dark'
                      ? 'text-gray-300 hover:text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  {item}
                </motion.button>
              ))}
              <Link
                to="/auth/login"
                className={cn(
                  "px-4 py-2 rounded-lg font-medium transition-all duration-200 border",
                  resolvedTheme === 'dark'
                    ? 'text-white border-white/20 hover:bg-white/10'
                    : 'text-gray-900 border-gray-300 hover:bg-gray-100'
                )}
              >
                Login
              </Link>
              <Link
                to="/auth/register"
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
              >
                Sign Up
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <button
                className={cn(
                  "backdrop-blur-sm border p-2 rounded-lg",
                  resolvedTheme === 'dark'
                    ? 'bg-white/5 border-white/10'
                    : 'bg-gray-200/50 border-gray-300'
                )}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className={cn(
                    "h-6 w-6",
                    resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'
                  )} />
                ) : (
                  <Menu className={cn(
                    "h-6 w-6",
                    resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'
                  )} />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            className={cn(
              "md:hidden backdrop-blur-sm border-t mx-4 mb-4 rounded-lg p-4",
              resolvedTheme === 'dark'
                ? 'bg-white/5 border-white/10'
                : 'bg-white/40 border-gray-200'
            )}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="space-y-4">
              <ThemeToggle />
              {['features', 'testimonials', 'pricing', 'about', 'contact'].map((item) => (
                <button
                  key={item}
                  onClick={() => scrollToSection(item)}
                  className={cn(
                    "block transition-colors duration-200 capitalize",
                    resolvedTheme === 'dark'
                      ? 'text-gray-300 hover:text-white'
                      : 'text-gray-600 hover:text-gray-900'
                  )}
                >
                  {item}
                </button>
              ))}
              <Link to="/auth/login" className={cn(
                "block px-4 py-2 rounded-lg font-medium transition-all duration-200 border text-center",
                resolvedTheme === 'dark'
                  ? 'text-white border-white/20 hover:bg-white/10'
                  : 'text-gray-900 border-gray-300 hover:bg-gray-100'
              )}>
                Login
              </Link>
              <Link
                to="/auth/register"
                className="block bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-2 rounded-lg font-medium text-center"
              >
                Sign Up
              </Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 min-h-screen flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            className={cn(
              "backdrop-blur-xl rounded-3xl p-8 sm:p-12 lg:p-16 shadow-2xl border",
              resolvedTheme === 'dark'
                ? 'bg-white/5 border-white/10'
                : 'bg-white/40 border-gray-200'
            )}
            ref={heroAnimation.ref}
            initial="hidden"
            animate={heroAnimation.controls}
            variants={fadeInUp}
          >
            <motion.h1
              className={cn(
                "text-4xl sm:text-5xl lg:text-6xl font-bold mb-6",
                resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'
              )}
              variants={fadeInUp}
            >
              Smart Invoice Reminders
              <span className="block mt-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                Powered by AI
              </span>
            </motion.h1>

            <motion.p
              className={cn(
                "text-xl sm:text-2xl mb-8 max-w-3xl mx-auto leading-relaxed",
                resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              )}
              variants={fadeInUp}
            >
              Automate your payment follow-ups with intelligent, contextual reminders that actually get results.
              Stop chasing payments and start focusing on what matters.
            </motion.p>

            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
              variants={fadeInUp}
            >
              <Link
                to="/auth/register"
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg flex items-center gap-2 min-w-[200px] justify-center hover:from-purple-700 hover:to-blue-700 transition-all duration-200 hover:scale-105"
              >
                Try Free for 14 Days
                <ArrowRight className="h-5 w-5" />
              </Link>
              <button className={cn(
                "backdrop-blur-sm border px-8 py-4 rounded-lg font-semibold text-lg flex items-center gap-2 min-w-[200px] justify-center transition-all duration-200",
                resolvedTheme === 'dark'
                  ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                  : 'bg-gray-200/50 border-gray-300 text-gray-800 hover:bg-gray-200/70'
              )}>
                <Play className="h-5 w-5" />
                Learn More
              </button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              className={cn(
                "pt-8 border-t",
                resolvedTheme === 'dark' ? 'border-white/10' : 'border-gray-200'
              )}
              variants={fadeInUp}
            >
              <p className={cn(
                "text-sm mb-4",
                resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              )}>Trusted by freelancers and businesses worldwide</p>
              <div className="flex items-center justify-center gap-8 opacity-100">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className={cn(
                    "text-sm",
                    resolvedTheme === 'dark' ? 'text-white' : 'text-gray-700'
                  )}>14-day free trial</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className={cn(
                    "text-sm",
                    resolvedTheme === 'dark' ? 'text-white' : 'text-gray-700'
                  )}>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-400" />
                  <span className={cn(
                    "text-sm",
                    resolvedTheme === 'dark' ? 'text-white' : 'text-gray-700'
                  )}>Cancel anytime</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            ref={featuresAnimation.ref}
            initial="hidden"
            animate={featuresAnimation.controls}
            variants={fadeInUp}
          >
            <h2 className={cn(
              "text-3xl sm:text-4xl lg:text-5xl font-bold mb-6",
              resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'
            )}>
              Why Choose <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">DueSpark</span>?
            </h2>
            <p className={cn(
              "text-xl max-w-3xl mx-auto",
              resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            )}>
              Our AI-powered platform takes the hassle out of payment collection with smart, personalized reminders that work.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="hidden"
            animate={featuresAnimation.controls}
          >
            {[
              {
                icon: Brain,
                title: "AI-Powered Intelligence",
                description: "Our smart AI analyzes payment patterns and crafts personalized reminder messages that get better results than generic templates.",
                color: "from-purple-500/20 to-blue-500/20",
                iconColor: "text-purple-400"
              },
              {
                icon: Clock,
                title: "Automated Workflows",
                description: "Set up once and let DueSpark handle the rest. Automatic reminders at optimal times ensure you never miss a follow-up.",
                color: "from-blue-500/20 to-indigo-500/20",
                iconColor: "text-blue-400"
              },
              {
                icon: TrendingUp,
                title: "Improved Cash Flow",
                description: "Get paid faster with reminders that actually work. Our users see 40% faster payment collection on average.",
                color: "from-indigo-500/20 to-purple-500/20",
                iconColor: "text-indigo-400"
              },
              {
                icon: ShieldCheck,
                title: "Professional & Friendly",
                description: "Maintain great client relationships with reminders that are firm but friendly, keeping your reputation intact.",
                color: "from-green-500/20 to-emerald-500/20",
                iconColor: "text-green-400"
              },
              {
                icon: Zap,
                title: "Quick Setup",
                description: "Get started in minutes, not hours. Import your existing invoices and start automating your payment reminders today.",
                color: "from-orange-500/20 to-red-500/20",
                iconColor: "text-orange-400"
              },
              {
                icon: BarChart3,
                title: "Smart Analytics",
                description: "Track payment trends, reminder effectiveness, and cash flow patterns with detailed analytics and insights.",
                color: "from-pink-500/20 to-rose-500/20",
                iconColor: "text-pink-400"
              }
            ].map((feature, index) => (
              <motion.div
                key={index}
                className={cn(
                  "backdrop-blur-sm border rounded-2xl p-8 transition-all duration-300 hover:scale-105",
                  resolvedTheme === 'dark'
                    ? 'bg-white/3 border-white/10 hover:bg-white/8 hover:border-white/20'
                    : 'bg-white/40 border-gray-200 hover:bg-white/60 hover:border-gray-300'
                )}
                variants={scaleIn}
              >
                <div className={cn(
                  "flex items-center justify-center w-16 h-16 rounded-xl mb-6 mx-auto bg-gradient-to-br",
                  feature.color
                )}>
                  <feature.icon className={cn("h-8 w-8", feature.iconColor)} />
                </div>
                <h3 className={cn(
                  "text-xl font-semibold mb-4 text-center",
                  resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'
                )}>{feature.title}</h3>
                <p className={cn(
                  "text-center leading-relaxed",
                  resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                )}>
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section id="testimonials" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            ref={testimonialsAnimation.ref}
            initial="hidden"
            animate={testimonialsAnimation.controls}
            variants={fadeInUp}
          >
            <h2 className={cn(
              "text-3xl sm:text-4xl lg:text-5xl font-bold mb-6",
              resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'
            )}>
              What Our Customers Say
            </h2>
            <p className={cn(
              "text-xl max-w-3xl mx-auto",
              resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            )}>
              Don't just take our word for it. See how DueSpark has transformed payment collection for businesses like yours.
            </p>
          </motion.div>

          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="hidden"
            animate={testimonialsAnimation.controls}
          >
            {[
              {
                name: "Sarah Chen",
                role: "Freelance Designer",
                company: "Studio SC",
                quote: "DueSpark has completely transformed how I handle payment reminders. I used to spend hours each week chasing late payments, but now the AI handles it all automatically. My collection rate improved by 45% in just two months!",
                rating: 5,
                avatar: "SC"
              },
              {
                name: "Marcus Rodriguez",
                role: "Agency Owner",
                company: "Digital Wave Marketing",
                quote: "As an agency managing 50+ clients, keeping track of payments was a nightmare. DueSpark's intelligent reminders maintain our professional relationships while ensuring we get paid on time. It's been a game-changer for our cash flow.",
                rating: 5,
                avatar: "MR"
              },
              {
                name: "Emily Thompson",
                role: "Consultant",
                company: "Thompson Advisory",
                quote: "The personalized AI messages are incredible. Instead of generic reminder templates, DueSpark creates contextual, professional messages that actually get responses. My clients appreciate the thoughtful approach.",
                rating: 5,
                avatar: "ET"
              }
            ].map((testimonial, index) => (
              <motion.div
                key={index}
                className={cn(
                  "relative p-6 rounded-2xl backdrop-blur-sm border transition-all duration-300",
                  resolvedTheme === 'dark'
                    ? 'bg-white/5 border-white/10 hover:bg-white/10'
                    : 'bg-white/70 border-gray-200 hover:bg-white/90'
                )}
                variants={fadeInUp}
                whileHover={{ scale: 1.02 }}
              >
                {/* Quote Icon */}
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center mb-4",
                  "bg-gradient-to-r from-purple-500/20 to-blue-500/20"
                )}>
                  <Quote className="h-6 w-6 text-purple-400" />
                </div>

                {/* Rating */}
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>

                {/* Quote */}
                <p className={cn(
                  "text-sm mb-6 italic leading-relaxed",
                  resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                )}>
                  "{testimonial.quote}"
                </p>

                {/* Author */}
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm",
                    "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                  )}>
                    {testimonial.avatar}
                  </div>
                  <div>
                    <p className={cn(
                      "font-semibold text-sm",
                      resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'
                    )}>
                      {testimonial.name}
                    </p>
                    <p className={cn(
                      "text-xs",
                      resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                    )}>
                      {testimonial.role} • {testimonial.company}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            ref={pricingAnimation.ref}
            initial="hidden"
            animate={pricingAnimation.controls}
            variants={fadeInUp}
          >
            <h2 className={cn(
              "text-3xl sm:text-4xl lg:text-5xl font-bold mb-6",
              resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'
            )}>
              Simple, transparent pricing
            </h2>
            <p className={cn(
              "text-xl max-w-3xl mx-auto",
              resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            )}>
              Choose the plan that fits your business needs
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto"
            variants={staggerContainer}
            initial="hidden"
            animate={pricingAnimation.controls}
          >
            {/* Pricing cards would go here - using same structure as original but with glassmorphic styling */}
            {[
              {
                name: "Freemium",
                price: "$0",
                description: "Perfect for getting started with basic invoice reminders",
                features: ["5 clients max", "20 invoices/month", "Basic templates", "Daily reminders", "Email support"],
                buttonText: "Try Free for 14 Days",
                popular: false
              },
              {
                name: "Professional",
                price: "$29",
                description: "Everything you need to scale your business with AI-powered features",
                features: ["Unlimited clients", "Unlimited invoices", "AI-powered features", "Custom branding", "Advanced analytics", "Priority support", "Integrations"],
                buttonText: "Try Free for 14 Days",
                popular: true
              },
              {
                name: "Agency",
                price: "$99",
                description: "Advanced collaboration and white-label options for agencies and teams",
                features: ["Everything in Professional", "Multi-user access", "API access", "White-label branding", "Realtime reminders", "Zapier integration", "Webhooks"],
                buttonText: "Contact Sales",
                popular: false
              }
            ].map((plan, index) => (
              <motion.div
                key={index}
                className={cn(
                  "backdrop-blur-xl border rounded-2xl p-8 relative transition-all duration-300 hover:scale-105",
                  resolvedTheme === 'dark' ? 'bg-white/5' : 'bg-white/40',
                  plan.popular
                    ? "border-purple-500/50 shadow-purple-500/25 shadow-2xl"
                    : resolvedTheme === 'dark'
                      ? "border-white/10 hover:border-white/20"
                      : "border-gray-200 hover:border-gray-300"
                )}
                variants={scaleIn}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-2 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className={cn(
                    "text-2xl font-bold mb-2",
                    resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'
                  )}>{plan.name}</h3>
                  <div className={cn(
                    "text-4xl font-bold mb-1",
                    resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'
                  )}>{plan.price}</div>
                  <div className={cn(
                    "mb-6",
                    resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  )}>per month</div>
                  <p className={cn(
                    resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                  )}>{plan.description}</p>
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center gap-3">
                      <Check className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className={cn(
                        resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      )}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/auth/register"
                  className={cn(
                    "block w-full text-center px-6 py-3 rounded-lg font-semibold transition-all duration-200",
                    plan.popular
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700"
                      : resolvedTheme === 'dark'
                        ? "bg-white/5 backdrop-blur-sm border border-white/10 text-white hover:bg-white/10"
                        : "bg-gray-200/50 backdrop-blur-sm border border-gray-300 text-gray-800 hover:bg-gray-200/70"
                  )}
                >
                  {plan.buttonText}
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            className={cn(
              "backdrop-blur-xl rounded-3xl p-8 sm:p-12 lg:p-16 shadow-2xl border",
              resolvedTheme === 'dark'
                ? 'bg-white/5 border-white/10'
                : 'bg-white/40 border-gray-200'
            )}
            ref={ctaAnimation.ref}
            initial="hidden"
            animate={ctaAnimation.controls}
            variants={fadeInUp}
          >
            <h2 className={cn(
              "text-3xl sm:text-4xl lg:text-5xl font-bold mb-6",
              resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'
            )}>
              Ready to Get Paid Faster?
            </h2>
            <p className={cn(
              "text-xl mb-8 max-w-2xl mx-auto",
              resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            )}>
              Join thousands of freelancers and businesses who've automated their payment collection with DueSpark.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                to="/auth/register"
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg flex items-center gap-2 min-w-[200px] justify-center hover:from-purple-700 hover:to-blue-700 transition-all duration-200 hover:scale-105"
              >
                Try Free for 14 Days
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                to="/auth/login"
                className={cn(
                  "backdrop-blur-sm border px-8 py-4 rounded-lg font-semibold text-lg min-w-[200px] text-center transition-all duration-200",
                  resolvedTheme === 'dark'
                    ? 'bg-white/5 border-white/10 text-white hover:bg-white/10'
                    : 'bg-gray-200/50 border-gray-300 text-gray-800 hover:bg-gray-200/70'
                )}
              >
                Sign In
              </Link>
            </div>
            <p className={cn(
              "text-sm mt-6",
              resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            )}>
              14-day free trial • No credit card required • Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            className="text-center mb-16"
            ref={aboutAnimation.ref}
            initial="hidden"
            animate={aboutAnimation.controls}
            variants={fadeInUp}
          >
            <h2 className={cn(
              "text-3xl sm:text-4xl lg:text-5xl font-bold mb-6",
              resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'
            )}>
              About <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">DueSpark</span>
            </h2>
            <p className={cn(
              "text-xl max-w-3xl mx-auto",
              resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            )}>
              We're on a mission to help freelancers and small businesses get paid faster while maintaining great client relationships.
            </p>
          </motion.div>

          <motion.div
            className="grid md:grid-cols-2 gap-12 items-center"
            variants={staggerContainer}
            initial="hidden"
            animate={aboutAnimation.controls}
          >
            {/* Story */}
            <motion.div variants={fadeInUp}>
              <div className={cn(
                "backdrop-blur-sm border rounded-2xl p-8",
                resolvedTheme === 'dark'
                  ? 'bg-white/3 border-white/10'
                  : 'bg-white/40 border-gray-200'
              )}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                    <Heart className="h-6 w-6 text-purple-400" />
                  </div>
                  <h3 className={cn(
                    "text-2xl font-semibold",
                    resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'
                  )}>Our Story</h3>
                </div>
                <p className={cn(
                  "leading-relaxed mb-4",
                  resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                )}>
                  Born from the frustration of chasing overdue payments, DueSpark was created by freelancers, for freelancers. We understand the delicate balance between getting paid and maintaining client relationships.
                </p>
                <p className={cn(
                  "leading-relaxed",
                  resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                )}>
                  Our AI-powered approach ensures your reminders are always professional, timely, and effective—so you can focus on what you do best.
                </p>
              </div>
            </motion.div>

            {/* Mission */}
            <motion.div variants={fadeInUp}>
              <div className={cn(
                "backdrop-blur-sm border rounded-2xl p-8",
                resolvedTheme === 'dark'
                  ? 'bg-white/3 border-white/10'
                  : 'bg-white/40 border-gray-200'
              )}>
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20">
                    <Target className="h-6 w-6 text-blue-400" />
                  </div>
                  <h3 className={cn(
                    "text-2xl font-semibold",
                    resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'
                  )}>Our Mission</h3>
                </div>
                <p className={cn(
                  "leading-relaxed mb-4",
                  resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                )}>
                  To eliminate the stress and awkwardness of payment collection through intelligent automation. We believe getting paid shouldn't damage business relationships.
                </p>
                <ul className="space-y-3">
                  {[
                    "Reduce payment collection time by 40%",
                    "Maintain professional client relationships",
                    "Eliminate manual follow-up tasks",
                    "Provide actionable payment insights"
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                      <span className={cn(
                        resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
                      )}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </motion.div>

          {/* Team Stats */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16"
            variants={staggerContainer}
            initial="hidden"
            animate={aboutAnimation.controls}
          >
            {[
              { icon: Users, number: "10,000+", label: "Active Users" },
              { icon: Globe, number: "50+", label: "Countries" },
              { icon: Award, number: "99.9%", label: "Uptime" }
            ].map((stat, index) => (
              <motion.div
                key={index}
                className={cn(
                  "text-center backdrop-blur-sm border rounded-2xl p-8",
                  resolvedTheme === 'dark'
                    ? 'bg-white/3 border-white/10'
                    : 'bg-white/40 border-gray-200'
                )}
                variants={scaleIn}
              >
                <div className="flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 mx-auto mb-4">
                  <stat.icon className="h-8 w-8 text-purple-400" />
                </div>
                <div className={cn(
                  "text-3xl font-bold mb-2",
                  resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'
                )}>{stat.number}</div>
                <div className={cn(
                  "text-sm",
                  resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                )}>{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative z-10 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="text-center mb-16"
            ref={contactAnimation.ref}
            initial="hidden"
            animate={contactAnimation.controls}
            variants={fadeInUp}
          >
            <h2 className={cn(
              "text-3xl sm:text-4xl lg:text-5xl font-bold mb-6",
              resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'
            )}>
              Get in Touch
            </h2>
            <p className={cn(
              "text-xl max-w-2xl mx-auto",
              resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
            )}>
              Have questions or need support? We'd love to hear from you. Reach out and we'll get back to you as soon as possible.
            </p>
          </motion.div>

          <motion.div
            className="max-w-2xl mx-auto"
            variants={fadeInUp}
            initial="hidden"
            animate={contactAnimation.controls}
          >
              <div className={cn(
                "backdrop-blur-sm border rounded-2xl p-8",
                resolvedTheme === 'dark'
                  ? 'bg-white/3 border-white/10'
                  : 'bg-white/40 border-gray-200'
              )}>
                <h3 className={cn(
                  "text-2xl font-semibold mb-6",
                  resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'
                )}>Send us a Message</h3>

                <form className="space-y-6">
                  <div>
                    <label className={cn(
                      "block text-sm font-medium mb-2",
                      resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    )}>
                      Name
                    </label>
                    <input
                      type="text"
                      className={cn(
                        "w-full px-4 py-3 rounded-lg border backdrop-blur-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500",
                        resolvedTheme === 'dark'
                          ? 'bg-white/5 border-white/10 text-white placeholder-gray-400'
                          : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500'
                      )}
                      placeholder="Your name"
                    />
                  </div>

                  <div>
                    <label className={cn(
                      "block text-sm font-medium mb-2",
                      resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    )}>
                      Email
                    </label>
                    <input
                      type="email"
                      className={cn(
                        "w-full px-4 py-3 rounded-lg border backdrop-blur-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500",
                        resolvedTheme === 'dark'
                          ? 'bg-white/5 border-white/10 text-white placeholder-gray-400'
                          : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500'
                      )}
                      placeholder="your@email.com"
                    />
                  </div>

                  <div>
                    <label className={cn(
                      "block text-sm font-medium mb-2",
                      resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    )}>
                      Message
                    </label>
                    <textarea
                      rows={4}
                      className={cn(
                        "w-full px-4 py-3 rounded-lg border backdrop-blur-sm transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none",
                        resolvedTheme === 'dark'
                          ? 'bg-white/5 border-white/10 text-white placeholder-gray-400'
                          : 'bg-white/50 border-gray-300 text-gray-900 placeholder-gray-500'
                      )}
                      placeholder="Tell us how we can help..."
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 hover:from-purple-700 hover:to-blue-700 transition-all duration-200 hover:scale-105"
                  >
                    Send Message
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Logo & Description */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <Zap className={cn("h-8 w-8", resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900')} />
                <span className={cn("text-2xl font-bold", resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900')}>DueSpark</span>
              </div>
              <p className={cn(
                "max-w-md",
                resolvedTheme === 'dark' ? 'text-gray-300' : 'text-gray-600'
              )}>
                Smart invoice reminders powered by AI. Get paid faster while maintaining great client relationships.
              </p>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className={cn(
                "font-semibold mb-4",
                resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'
              )}>Product</h4>
              <ul className="space-y-2">
                <li><button onClick={() => scrollToSection('features')} className={cn(
                  "transition-colors",
                  resolvedTheme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                )}>Features</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className={cn(
                  "transition-colors",
                  resolvedTheme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                )}>Pricing</button></li>
                <li><a href="#" className={cn(
                  "transition-colors",
                  resolvedTheme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                )}>Integrations</a></li>
                <li><a href="#" className={cn(
                  "transition-colors",
                  resolvedTheme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                )}>API</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className={cn(
                "font-semibold mb-4",
                resolvedTheme === 'dark' ? 'text-white' : 'text-gray-900'
              )}>Support</h4>
              <ul className="space-y-2">
                <li><a href="#" className={cn(
                  "transition-colors",
                  resolvedTheme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                )}>Help Center</a></li>
                <li><button onClick={() => scrollToSection('contact')} className={cn(
                  "transition-colors",
                  resolvedTheme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                )}>Contact Us</button></li>
                <li><a href="#" className={cn(
                  "transition-colors",
                  resolvedTheme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                )}>Privacy Policy</a></li>
                <li><a href="#" className={cn(
                  "transition-colors",
                  resolvedTheme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'
                )}>Terms of Service</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className={cn(
              "text-sm",
              resolvedTheme === 'dark' ? 'text-gray-400' : 'text-gray-600'
            )}>
              © 2025 DueSpark. All rights reserved.
            </p>
            <div className="flex items-center space-x-6 mt-4 md:mt-0">
              <a href="#" className={cn(
                "transition-colors",
                resolvedTheme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              )}>
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className={cn(
                "transition-colors",
                resolvedTheme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              )}>
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className={cn(
                "transition-colors",
                resolvedTheme === 'dark' ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'
              )}>
                <Linkedin className="h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingView