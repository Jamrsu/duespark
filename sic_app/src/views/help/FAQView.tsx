import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface FAQItem {
  id: string;
  category: string;
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  // Getting Started
  {
    id: '1',
    category: 'Getting Started',
    question: 'What is DueSpark and how does it work?',
    answer: 'DueSpark is an automated invoice chasing platform that helps businesses get paid faster. It automatically sends professional payment reminders to your clients at optimal times, tracks invoice status, and provides detailed analytics on your payment patterns.'
  },
  {
    id: '2',
    category: 'Getting Started',
    question: 'How do I get started with DueSpark?',
    answer: 'Getting started is simple: 1) Sign up for a free account, 2) Verify your email address, 3) Connect your payment processor (Stripe recommended), 4) Upload your first invoice or integrate with your existing invoicing system, 5) Set up your automated reminder schedules.'
  },
  {
    id: '3',
    category: 'Getting Started',
    question: 'Do I need technical knowledge to use DueSpark?',
    answer: 'No technical knowledge required! DueSpark is designed for business owners and finance teams. Our intuitive interface makes it easy to set up automated reminders, track payments, and manage your invoicing process without any coding.'
  },

  // Invoices & Reminders
  {
    id: '4',
    category: 'Invoices & Reminders',
    question: 'How do I add invoices to DueSpark?',
    answer: 'You can add invoices in several ways: 1) Upload invoices manually through the dashboard, 2) Import from CSV files, 3) Connect your existing invoicing software through our integrations, 4) Use our API for custom integrations. Each method automatically extracts key information like due dates and amounts.'
  },
  {
    id: '5',
    category: 'Invoices & Reminders',
    question: 'When does DueSpark send payment reminders?',
    answer: 'DueSpark uses intelligent scheduling to send reminders at optimal times. By default: 1) Friendly reminder 3 days before due date, 2) Due date reminder on the day payment is due, 3) Overdue reminders at 3, 7, 14, and 30 days past due. You can customize these schedules for each client.'
  },
  {
    id: '6',
    category: 'Invoices & Reminders',
    question: 'Can I customize the reminder messages?',
    answer: 'Absolutely! You can create custom templates for each stage of the reminder process. Customize the tone, add your branding, include specific payment instructions, and even create different templates for different client types or invoice amounts.'
  },
  {
    id: '7',
    category: 'Invoices & Reminders',
    question: 'What happens if a client pays after I\'ve sent reminders?',
    answer: 'DueSpark automatically detects payments and stops sending reminders. When you mark an invoice as paid or we detect payment through your connected payment processor, all future reminders are cancelled immediately.'
  },

  // Pricing & Billing
  {
    id: '8',
    category: 'Pricing & Billing',
    question: 'What does DueSpark cost?',
    answer: 'We offer flexible pricing plans: Free tier (up to 5 active invoices), Basic ($19/month for up to 100 invoices), Pro ($49/month for up to 500 invoices), and Agency ($99/month for unlimited invoices). All paid plans include advanced features like custom templates, analytics, and priority support.'
  },
  {
    id: '9',
    category: 'Pricing & Billing',
    question: 'Is there a free trial?',
    answer: 'Yes! Our Free tier allows you to manage up to 5 active invoices permanently. For higher limits, we offer a 14-day free trial of any paid plan. No credit card required to start - you can upgrade anytime.'
  },
  {
    id: '10',
    category: 'Pricing & Billing',
    question: 'Can I cancel my subscription anytime?',
    answer: 'Yes, you can cancel your subscription at any time with no cancellation fees. Your service continues until the end of your current billing period. You can downgrade to our Free tier to keep basic functionality.'
  },
  {
    id: '11',
    category: 'Pricing & Billing',
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, American Express) and debit cards through our secure Stripe payment processing. We also support ACH/bank transfers for annual plans.'
  },

  // Referral Program
  {
    id: '12',
    category: 'Referral Program',
    question: 'How does the referral program work?',
    answer: 'Refer friends or colleagues to DueSpark using your unique referral link. When they sign up and maintain a paid subscription for 30+ days, you earn 1 month of free service credit. There\'s no limit to how many people you can refer!'
  },
  {
    id: '13',
    category: 'Referral Program',
    question: 'When do I receive my referral rewards?',
    answer: 'Referral rewards are granted after your referred user maintains an active paid subscription for 30+ days. This ensures genuine long-term subscriptions and prevents abuse. Credits are automatically applied to your account.'
  },
  {
    id: '14',
    category: 'Referral Program',
    question: 'What happens if someone I referred cancels early?',
    answer: 'If a referred user cancels their subscription within the first 30 days, any awarded referral credits are automatically revoked. This policy helps maintain the integrity of our referral program and ensures rewards are only given for successful long-term referrals.'
  },
  {
    id: '15',
    category: 'Referral Program',
    question: 'How do I track my referrals?',
    answer: 'Visit the Referrals section in your dashboard to see your referral code, share link, total referrals, successful referrals, and earned credits. You can track the status of each referral and see when credits are applied to your account.'
  },

  // Integrations
  {
    id: '16',
    category: 'Integrations',
    question: 'What software does DueSpark integrate with?',
    answer: 'DueSpark integrates with popular invoicing and accounting software including QuickBooks, Xero, FreshBooks, Wave, and more. We also offer Stripe integration for automatic payment detection and webhook support for custom integrations.'
  },
  {
    id: '17',
    category: 'Integrations',
    question: 'Do you have an API?',
    answer: 'Yes! We provide a comprehensive REST API that allows you to create invoices, manage clients, send reminders, and access analytics programmatically. Full API documentation is available in your dashboard under the Integrations section.'
  },
  {
    id: '18',
    category: 'Integrations',
    question: 'Can I connect my existing payment processor?',
    answer: 'Absolutely! We support integration with Stripe, PayPal, Square, and other major payment processors. This allows DueSpark to automatically detect when invoices are paid and stop sending reminders accordingly.'
  },

  // Features & Functionality
  {
    id: '19',
    category: 'Features & Functionality',
    question: 'Can I set different reminder schedules for different clients?',
    answer: 'Yes! You can create custom reminder schedules for individual clients or client groups. Some clients might prefer gentle reminders, while others might need more frequent follow-ups. DueSpark allows you to tailor the experience for each relationship.'
  },
  {
    id: '20',
    category: 'Features & Functionality',
    question: 'Does DueSpark support multiple languages?',
    answer: 'Currently, DueSpark operates in English, but we\'re working on multi-language support. You can customize your reminder templates in any language to communicate with international clients in their preferred language.'
  },
  {
    id: '21',
    category: 'Features & Functionality',
    question: 'Can I see analytics on my payment patterns?',
    answer: 'Yes! DueSpark provides detailed analytics including average payment time, client payment patterns, reminder effectiveness, cash flow projections, and more. These insights help you optimize your invoicing strategy and improve cash flow.'
  },
  {
    id: '22',
    category: 'Features & Functionality',
    question: 'What happens to overdue invoices?',
    answer: 'DueSpark continues sending reminders according to your schedule until you mark the invoice as paid, cancelled, or pause the reminders. You can set up escalation procedures, such as involving collections agencies or legal action after a certain period.'
  },

  // Security & Privacy
  {
    id: '23',
    category: 'Security & Privacy',
    question: 'Is my data secure with DueSpark?',
    answer: 'Absolutely! We use bank-level encryption (AES-256) for data storage and TLS 1.3 for data transmission. Our infrastructure is hosted on secure cloud platforms with regular security audits, backups, and monitoring. We\'re also GDPR and SOC 2 compliant.'
  },
  {
    id: '24',
    category: 'Security & Privacy',
    question: 'Do you share my data with third parties?',
    answer: 'No, we never sell or share your customer data with third parties for marketing purposes. We only share data with essential service providers (like email delivery services) under strict confidentiality agreements. You maintain full ownership of your data.'
  },
  {
    id: '25',
    category: 'Security & Privacy',
    question: 'Can I export my data?',
    answer: 'Yes! You can export all your data at any time in standard formats (CSV, JSON). This includes invoices, clients, payment history, and analytics. We believe in data portability and never lock you into our platform.'
  },

  // Support & Troubleshooting
  {
    id: '26',
    category: 'Support & Troubleshooting',
    question: 'What support do you offer?',
    answer: 'We provide comprehensive support including email support (24-48 hour response), live chat during business hours for paid plans, extensive documentation, video tutorials, and a community forum. Enterprise clients get dedicated account management.'
  },
  {
    id: '27',
    category: 'Support & Troubleshooting',
    question: 'What if a reminder email bounces or fails to send?',
    answer: 'DueSpark automatically tracks email delivery and bounces. If an email fails, we\'ll retry automatically and notify you. You can update client contact information and resend manually. We also provide delivery reports for all communications.'
  },
  {
    id: '28',
    category: 'Support & Troubleshooting',
    question: 'Can I pause reminders temporarily?',
    answer: 'Yes! You can pause reminders for individual invoices or clients at any time. This is useful when you\'re in payment negotiations, extending due dates, or during holidays. Reminders can be resumed whenever you\'re ready.'
  },
  {
    id: '29',
    category: 'Support & Troubleshooting',
    question: 'What happens if I exceed my plan limits?',
    answer: 'If you approach your plan limits, we\'ll notify you in advance. You can upgrade to a higher plan anytime. If you temporarily exceed limits, your service continues uninterrupted - we\'ll just suggest upgrading to ensure optimal performance.'
  },

  // Business & Legal
  {
    id: '30',
    category: 'Business & Legal',
    question: 'Is DueSpark suitable for my industry?',
    answer: 'DueSpark works for any business that sends invoices: consultants, freelancers, agencies, contractors, SaaS companies, retail businesses, and more. Our flexible platform adapts to different industries\' invoicing needs and payment cycles.'
  },
  {
    id: '31',
    category: 'Business & Legal',
    question: 'Are there any legal considerations when using automated reminders?',
    answer: 'Automated reminders are legal and widely accepted business practice. However, you should ensure compliance with local regulations like CAN-SPAM (US) or GDPR (EU). DueSpark includes unsubscribe options and respects opt-out requests automatically.'
  },
  {
    id: '32',
    category: 'Business & Legal',
    question: 'Can I use DueSpark internationally?',
    answer: 'Yes! DueSpark works globally. We support multiple currencies, international payment methods, and comply with international data protection regulations. Our email delivery network ensures reliable communication worldwide.'
  }
];

export default function FAQView() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  // Set page title
  React.useEffect(() => {
    document.title = 'FAQ - DueSpark | Frequently Asked Questions';
    return () => {
      document.title = 'DueSpark | Automated Invoice Chasing';
    };
  }, []);

  const categories = ['All', ...Array.from(new Set(faqData.map(item => item.category)))];

  const filteredFAQ = faqData.filter(item => {
    const matchesSearch = item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const expandAll = () => {
    setExpandedItems(new Set(filteredFAQ.map(item => item.id)));
  };

  const collapseAll = () => {
    setExpandedItems(new Set());
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center space-x-2 text-sm text-gray-500">
            <button
              onClick={() => navigate('/dashboard')}
              className="hover:text-gray-700 transition-colors"
            >
              Dashboard
            </button>
            <span>/</span>
            <span className="text-gray-900 font-medium">Help & FAQ</span>
          </nav>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Find answers to common questions about DueSpark's automated invoice chasing platform
            </p>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="flex-1 max-w-md">
              <label htmlFor="search" className="sr-only">
                Search FAQs
              </label>
              <input
                type="text"
                id="search"
                placeholder="Search questions and answers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-4">
              <label htmlFor="category" className="text-sm font-medium text-gray-700">
                Category:
              </label>
              <select
                id="category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Expand/Collapse Controls */}
            <div className="flex gap-2">
              <button
                onClick={expandAll}
                className="px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50"
              >
                Expand All
              </button>
              <button
                onClick={collapseAll}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div className="mt-4 text-sm text-gray-600">
            Showing {filteredFAQ.length} of {faqData.length} questions
            {searchTerm && (
              <span> matching "{searchTerm}"</span>
            )}
          </div>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {filteredFAQ.length > 0 ? (
            filteredFAQ.map((item) => (
              <div key={item.id} className="bg-white rounded-lg shadow-sm border">
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full px-6 py-4 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {item.category}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {item.question}
                      </h3>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      {expandedItems.has(item.id) ? (
                        <ChevronUp className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                  </div>
                </button>

                {expandedItems.has(item.id) && (
                  <div className="px-6 pb-4">
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.5-.881-6.172-2.328C5.108 11.979 5.108 11.021 5.828 9.672A7.962 7.962 0 0112 7c2.34 0 4.5.881 6.172 2.328.72 1.349.72 2.307 0 3.656z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No questions found</h3>
              <p className="text-gray-600">
                Try adjusting your search terms or category filter.
              </p>
            </div>
          )}
        </div>

        {/* Contact Support */}
        <div className="mt-12 bg-blue-50 rounded-lg p-8 text-center">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Can't find what you're looking for?
          </h3>
          <p className="text-gray-600 mb-6">
            Our support team is here to help! Get in touch and we'll get back to you as soon as possible.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:support@duespark.com"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Email Support
            </a>
            <button className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
              Live Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}