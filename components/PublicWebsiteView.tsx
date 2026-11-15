'use client';

import React, { useState } from 'react';
import {
  Bird,
  Beef,
  ShieldCheck,
  Fish,
  Truck,
  Landmark,
  Lock,
  Layers,
  ArrowRight,
  MapPin,
  Phone,
  Mail,
  CheckCircle2,
  Sun,
  Moon,
  Globe,
  Menu,
  X,
  TrendingUp,
  BarChart3,
  FileSpreadsheet,
  Activity,
  Building2,
  Coins,
  Zap,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Lightbulb,
  BadgePercent,
  Check,
  Calendar,
  Compass,
} from 'lucide-react';
import BrandLogo from './BrandLogo';

interface PublicWebsiteViewProps {
  onAccessErpConsole: () => void;
  isSigningIn?: boolean;
  darkMode?: boolean;
  onToggleDarkMode?: () => void;
  lang?: 'en' | 'bn';
  onToggleLang?: () => void;
}

type PreviewTabId = 'overview' | 'poultry' | 'livestock' | 'ledger';
type VerticalId = 'poultry' | 'cattle' | 'goat' | 'fisheries' | 'transport' | 'custom';
type DeepDiveTabId = 'startup' | 'profit' | 'revenue' | 'erp';

export default function PublicWebsiteView({
  onAccessErpConsole,
  isSigningIn = false,
  darkMode: controlledDarkMode,
  onToggleDarkMode,
  lang: controlledLang,
  onToggleLang,
}: PublicWebsiteViewProps) {
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [livestockImgFailed, setLivestockImgFailed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<PreviewTabId>('overview');
  const [activeVerticalId, setActiveVerticalId] = useState<VerticalId>('poultry');
  const [activeDeepDiveTab, setActiveDeepDiveTab] = useState<DeepDiveTabId>('startup');
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const toggleCardExpanded = (id: string) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const [localDark, setLocalDark] = useState(false);
  const [localLang, setLocalLang] = useState<'en' | 'bn'>('en');

  const isDark = controlledDarkMode !== undefined ? controlledDarkMode : localDark;
  const lang = controlledLang !== undefined ? controlledLang : localLang;

  const handleThemeToggle = () => {
    if (onToggleDarkMode) {
      onToggleDarkMode();
    } else {
      const next = !localDark;
      setLocalDark(next);
      if (typeof document !== 'undefined') {
        document.documentElement.classList.toggle('dark', next);
      }
    }
  };

  const handleLangToggle = () => {
    if (onToggleLang) {
      onToggleLang();
    } else {
      setLocalLang((prev) => (prev === 'en' ? 'bn' : 'en'));
    }
  };

  const bn = lang === 'bn';

  const verticals = [
    {
      id: 'poultry' as VerticalId,
      title: bn ? 'পোল্ট্রি ফার্মিং (ব্রয়লার, লেয়ার ও সোনালী)' : 'Poultry Farming (Broiler, Layer & Sonali)',
      shortTitle: bn ? 'পোল্ট্রি ফার্মিং' : 'Poultry Farming',
      subtitle: bn ? 'ব্যাচ-ভিত্তিক বৈজ্ঞানিক পোল্ট্রি ব্যবস্থাপনা' : 'Batch-Wise Commercial Poultry Operations',
      tagline: bn
        ? 'আধুনিক শেড নির্মাণ, ব্রুডিং, ফিড অপটিমাইজেশন ও দ্রুত টার্নওভারে সর্বোচ্চ লাভজনক খামার'
        : 'Engineered brooding, FCR optimization, disease control, and 35-day rapid cash turnaround',
      Icon: Bird,
      meta: bn ? 'গাজীপুর হাব · ১,০০০-৫০,০০০ বার্ড ব্যাচ' : 'Gazipur Hub · 1,000-50,000 Birds',
      accent: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20',
      badgeBg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      tags: ['Batch P&L', 'FCR 1.48-1.55', 'মৃত্যুহার < ২%', '৩৫ দিনে নগদ ক্যাশ'],
      desc: bn
        ? 'ব্যাচ-ভিত্তিক বাচ্চা ক্রয়, ব্রুডিং, ফিড কনভার্সন রেশিও (FCR) নিয়ন্ত্রণ, ভ্যাকসিন শিডিউল এবং পাইকারি আড়ত বিক্রয়।'
        : 'Batch-wise chick procurement, daily health logs, starter/finisher FCR tracking, vaccine schedules, and grading wholesale.',
      metrics: [
        { label: bn ? 'ব্যাচ টার্নওভার' : 'Batch Cycle', value: bn ? '৩৫-৩৮ দিন' : '35-38 Days', hint: bn ? 'পূর্ণ ব্রয়লার ওজন (২.২ কেজি)' : 'Full Broiler Maturity (2.2 KG)' },
        { label: bn ? 'নিট মুনাফা' : 'Net Margin', value: bn ? '৳২৫ - ৳৪০ / কেজি' : '৳25 - ৳40 / KG', hint: bn ? 'ফিড ও ওষুধ বাদে নিট লাভ' : 'After all feed & vet costs' },
        { label: bn ? 'টার্গেট এফসিআর' : 'Target FCR', value: '1.48 - 1.55', hint: bn ? '১ কেজি মাংসে মাত্র ১.৫ কেজি খাবার' : '1.5 KG feed per 1 KG meat' },
        { label: bn ? 'বাৎসরিক ROI' : 'Annual ROI', value: '35% - 50%', hint: bn ? 'বছরে ৭-৮টি ব্যাচ রোটেশন' : '7 to 8 batch rotations/yr' },
      ],
      startup: {
        heading: bn ? 'কীভাবে পোল্ট্রি খামার শুরু করবেন (গাইড ও সেটআপ)' : 'How to Launch a Profitable Poultry Farm',
        desc: bn
          ? 'উঁচু শুকনা জমি, পূর্ব-পশ্চিমমুখী পরিবেশবান্ধব শেড এবং গ্রেড-এ একদিনের বাচ্চা সংগ্রহের মাধ্যমে সফল খামারের ভিত্তি তৈরি হয়।'
          : 'Establish a profitable foundation through bio-secure shed architecture, quality DOC selection, and automated brooding.',
        steps: [
          {
            num: '০১',
            title: bn ? 'আধুনিক শেড নির্মাণ ও ভেন্টিলেশন' : 'Bio-Secure Shed & Ventilation Architecture',
            desc: bn
              ? 'উঁচু জমিতে পূর্ব-পশ্চিমমুখী খোলামেলা বা আধুনিক টানেল ভেন্টিলেশন শেড তৈরি করুন। প্রতি ব্রয়লারের জন্য ১-১.৫ বর্গফুট এবং লেয়ারের জন্য ২ বর্গফুট ফ্লোর স্পেস দিন। মেঝের ৩-৪ ইঞ্চি শুকনো ধানের তুষ বা কাঠের গুঁড়ার লিটার সর্বদা ঝরঝরে রাখুন।'
              : 'Construct east-west oriented sheds on elevated land with cross or tunnel ventilation. Allocate 1-1.5 sq ft per broiler and 2 sq ft per layer. Use 3-4 inches of dry rice husk or wood shavings for bedding.',
          },
          {
            num: '০২',
            title: bn ? 'উন্নত ১ দিনের বাচ্চা (DOC) সংগ্রহ' : 'Grade-A Day-Old Chick (DOC) Sourcing',
            desc: bn
              ? 'স্বনামধন্য রেজিস্টার্ড হ্যাচারি থেকে গ্রেড-এ একদিনের সুস্থ, চঞ্চল ও সঠিক ওজনের (৩৮-৪২ গ্রাম) বাচ্চা সংগ্রহ করুন। প্রথম ৭-১০ দিন ডিজিটাল ব্রুডারে সঠিক তাপমাত্রা (৯৫°F থেকে ধাপে ধাপে কমানো) কঠোরভাবে বজায় রাখুন।'
              : 'Procure Grade-A chicks (38-42g) from certified hatcheries. Maintain strict brooding temperatures (95°F ramping down weekly) with digital brooders during the critical first 7-10 days.',
          },
          {
            num: '০৩',
            title: bn ? 'অটোমেটিক ফিডার ও ড্রিংকার ইকুইপমেন্ট' : 'Automated Nipple Drinkers & Feeders',
            desc: bn
              ? 'লিটার ভেজা রোধ করতে স্বয়ংক্রিয় নিপল ড্রিংকার ও ড্রপ-কাপ ব্যবহার করুন। বয়সভিত্তিক বেল ফিডার, তাপমাত্রা-আর্দ্রতা মনিটরিং সেন্সর এবং লোডশেডিংয়ের জন্য ব্যাকআপ জেনারেটর নিশ্চিত করুন।'
              : 'Install leak-free nipple drinkers with drip cups to keep litter dry and ammonia-free. Setup age-appropriate bell feeders, digital thermo-hygrometers, and emergency generator power.',
          },
          {
            num: '০৪',
            title: bn ? 'প্রারম্ভিক ব্যাচ স্কেল ও বায়োসিকিউরিটি' : 'Batch Sizing & 3-Tier Biosecurity',
            desc: bn
              ? 'প্রথম পর্যায়ে ১,০০০ থেকে ২,৫০০ বাচ্চার ব্যাচ নিয়ে শুরু করা সবচেয়ে নিরাপদ ও পরিচালনাযোগ্য। খামারের প্রবেশপথে পটাসিয়াম ফুটবাথ, জীবাণুনাশক স্প্রে ও বহিরাগত প্রবেশ কঠোরভাবে বন্ধ রাখুন।'
              : 'Commence operations with 1,000 to 2,500 birds per batch to optimize learning. Mandate potassium permanganate footbaths, protective clothing, and restricted farm perimeter access.',
          },
        ],
      },
      profit: {
        heading: bn ? 'কীভাবে লাভ হয় ও খরচের নিয়ন্ত্রণ (গোপন সূত্র)' : 'How Profit is Generated (Operational Secrets)',
        desc: bn
          ? 'পোল্ট্রি শিল্পে লাভ মূলত নির্ভর করে খাদ্য খরচ হ্রাস, বৈজ্ঞানিক FCR নিয়ন্ত্রণ এবং রোগব্যাধি ঠেকিয়ে মৃত্যুহার সর্বনিম্ন রাখার ওপর।'
          : 'Poultry profitability hinges on feed conversion ratio (FCR), biosecurity mortality prevention, and rapid turnover.',
        points: [
          {
            title: bn ? 'FCR খাদ্য রূপান্তর হার অপটিমাইজেশন (১.৪৮ - ১.৫৫)' : 'FCR Feed Conversion Optimization (1.48 - 1.55)',
            desc: bn
              ? 'পোল্ট্রির মোট ব্যয়ের ৭০% খরচ হয় খাদ্যে। সঠিক সময়ে প্রি-স্টার্টার, স্টার্টার ও গ্রোয়ার ফিড প্রয়োগ করলে মাত্র ১.৫ কেজি খাবারে ১ কেজি জীবন্ত ওজন নিশ্চিত হয়, যা সরাসরি নিট লাভ দ্বিগুণ করে।'
              : 'Feed constitutes 70% of total capex. Precision feeding schedules ensure birds achieve 1 KG live weight with only 1.48-1.55 KG feed, maximizing net batch margin.',
            metric: 'FCR < 1.55',
          },
          {
            title: bn ? 'মৃত্যুহার ২% এর নিচে নামিয়ে রাখা' : 'Under-2% Mortality Guarantee',
            desc: bn
              ? '৩-৫ দিনে রানীক্ষেত (ND), ১০-১২ দিনে গামবোরো (IBD) এবং ১৯ দিনে বুস্টার ভ্যাকসিন নিখুঁতভাবে দিন। প্রতিদিনের মৃত্যুহার রেকর্ড করে যেকোনো সংক্রমণ শুরুর আগেই প্রতিরোধমূলক ব্যবস্থা নিন।'
              : 'Administer Marek, Newcastle (ND), Gumboro (IBD), and Bronchitis vaccines precisely on schedule. Early symptom logging contains outbreak risks below 2% mortality.',
            metric: 'Mortality < 2%',
          },
          {
            title: bn ? 'সরাসরি ফিড মিল থেকে বাল্ক ক্রয়' : 'Direct Mill Bulk Feed Procurement',
            desc: bn
              ? 'ডিলারের অতিরিক্ত মুনাফা এড়িয়ে সরাসরি ফিড মিল থেকে নগদ টাকায় বাল্ক ফিড কিনলে প্রতি বস্তায় ৳২০০-৳৩৫০ টাকা সাশ্রয় হয়। ১,০০০ মুরগির ব্যাচে এতে ৳১৫,০০০+ সরাসরি বাড়তি নিট লাভ থাকে।'
              : 'Procuring bulk feed directly from manufacturing mills bypasses middleman markups, saving ৳200-৳350 per 50kg bag and adding ৳15,000+ pure net profit per 1,000 birds.',
            metric: '৳৩৫০/বস্তা সাশ্রয়',
          },
          {
            title: bn ? 'দ্রুত টার্নওভার (বছরে ৭-৮টি ব্যাচ রোটেশন)' : 'Rapid Annual Capital Rotation (7-8 Cycles)',
            desc: bn
              ? 'ব্রয়লার মুরগি মাত্র ৩৫-৩৮ দিনেই ২.০-২.২ কেজি ওজন অর্জন করে। ১ সপ্তাহ শেড জীবাণুমুক্ত করে বছরে ৭ থেকে ৮টি ব্যাচ নামানো যায়, ফলে একই মূলধন বছরে বারবার চক্রবৃদ্ধি হারে লাভ তৈরি করে।'
              : 'Broilers reach 2.0-2.2 KG market weight within 35-38 days. With a 7-day sanitation interval, farms complete 7-8 rotations annually, compounding return on capital.',
            metric: '৭-৮ ব্যাচ/বছর',
          },
        ],
      },
      revenue: {
        heading: bn ? 'কী কী পণ্য, লাভ ও নগদ আয়ের হিসাব' : 'Revenue Streams & Net Profit Breakdown',
        desc: bn
          ? 'ব্রয়লার মাংস বিক্রির পাশাপাশি সোনালী জাত, ডিম ও পোল্ট্রি লিটার সার বিক্রি থেকে বহুমুখী নগদ ক্যাশফ্লো পাওয়া যায়।'
          : 'Earn continuous cash flow across live bird wholesale, daily layer egg batches, Sonali meat, and organic litter sales.',
        streams: [
          {
            name: bn ? 'লাইভ ব্রয়লার মাংস পাইকারি বিক্রয়' : 'Live Broiler Wholesale Offtake',
            rate: bn ? '৳১৬০ - ৳২০০ / কেজি' : '৳160 - ৳200 / KG',
            cycle: bn ? '৩৫-৩৮ দিনে হারভেস্ট' : '35-38 day harvest',
            net: bn ? '৳৫০,০০০ - ৳৭৫,০০০ নিট লাভ (প্রতি ১,০০০ মুরগি)' : '৳50,000 - ৳75,000 Net (per 1,000 birds)',
          },
          {
            name: bn ? 'সোনালী মুরগি বিক্রি (প্রিমিয়াম রেস্তোরাঁ ও আড়ত)' : 'Sonali Meat (Premium Restaurant Grade)',
            rate: bn ? '৳৩০০ - ৳৩৮০ / কেজি' : '৳300 - ৳380 / KG',
            cycle: bn ? '৬০-৭০ দিনে ৮০০-১০০০ গ্রাম' : '60-70 day cycle',
            net: bn ? '৩৫% - ৪০% উচ্চ নিট মুনাফা মার্জিন' : '35% - 40% Net Profit Margin',
          },
          {
            name: bn ? 'দৈনিক ডিম ক্যাশ সেলস (লেয়ার খামার)' : 'Daily Layer Table Egg Sales',
            rate: bn ? '৳৪০ - ৳৪৮ / হালি' : '৳40 - ৳48 / 4 Eggs',
            cycle: bn ? 'দৈনিক নগদ ক্যাশফ্লো' : 'Daily cash flow',
            net: bn ? '৯০-৯৫% পিক প্রোডাকশনে দৈনিক স্থায়ী মুনাফা' : 'Steady daily net cash at 90-95% peak lay',
          },
          {
            name: bn ? 'পোল্ট্রি লিটার ও অর্গানিক সার বিক্রি' : 'Organic Poultry Litter / Manure Bags',
            rate: bn ? '৳১৫০ - ৳২২০ / বস্তা' : '৳150 - ৳220 / Bag',
            cycle: bn ? 'প্রতি ব্যাচ শেষে' : 'Post-batch turnover',
            net: bn ? '৳১৫,০০০ - ৳২৫,০০০ অতিরিক্ত বোনাস আয়/ব্যাচ' : '৳15,000 - ৳25,000 bonus cash per batch',
          },
        ],
        summary: bn
          ? 'আর্থিক সারসংক্ষেপ: ১,০০০ ব্রয়লার মুরগির একটি স্ট্যান্ডার্ড ব্যাচে ৩৫ দিনে সব খরচ (বাচ্চা, ফিড, ওষুধ, বিদ্যুৎ ও শ্রমিক) বাদে ৳৫০,০০০ থেকে ৳৭৫,০০০ টাকা সম্পূর্ণ নিট ক্যাশ প্রফিট থাকে। বছরে ৭টি ব্যাচে মূলধনের ওপর ৩৫% থেকে ৫০% বার্ষিক রিটার্ন (ROI) অর্জিত হয়।'
          : 'Financial Summary: A standard 1,000-broiler batch yields ৳50,000 - ৳75,000 pure net cash profit in 35 days after chick, feed, medicine, power, and labor costs, producing a 35-50% annualized cash ROI.',
      },
      erp: {
        title: bn ? 'কৃষিভূমি ইআরপি কীভাবে পোল্ট্রি ফার্ম সহজ করে' : 'How KrishiVumi ERP Powers Poultry Batches',
        points: [
          bn ? 'স্বয়ংক্রিয় ব্যাচ P&L ও প্রতিদিনের খাদ্য খাওয়ার সাথে ওজনের তুলনামূলক FCR ক্যালকুলেশন।' : 'Automated batch P&L ledger tracking feed intake against daily live weight gain.',
          bn ? 'দৈনিক মৃত্যুহার ও রোগলক্ষণ এলার্ট—অস্বাভাবিক মৃত্যু বাড়লেই সুপার অ্যাডমিনকে তাৎক্ষণিক লাল সতর্কতা।' : 'Real-time mortality spike alerts notifying managers before disease spreads.',
          bn ? 'ফিড ও মেডিসিন স্টক শেষ হওয়ার আগেই স্বয়ংক্রিয় রিঅর্ডার সতর্কতা এবং পাইকারি বিক্রি সরাসরি ক্যাশ ও ব্যাংক লেজারে জমা।' : 'Automatic feed reorder levels and one-click wholesale sale posting directly to Cash & Bank.',
        ],
      },
    },
    {
      id: 'cattle' as VerticalId,
      title: bn ? 'ডেইরি ও বিফ ক্যাটল খামার (গাভী ও ষাঁড় মোটাতাজাকরণ)' : 'Dairy & Beef Cattle Farming (Dairy & Fattening)',
      shortTitle: bn ? 'ডেইরি ও ক্যাটল' : 'Dairy & Cattle',
      subtitle: bn ? 'হলস্টেইন ফ্রিজিয়ান দুধ উৎপাদন ও কোরবানির হাটের জন্য বৈজ্ঞানিক ষাঁড় মোটাতাজাকরণ' : 'Holstein Friesian Dairy Production & Qurbani Beef Fattening',
      tagline: bn
        ? 'আধুনিক কংক্রিট শেড, পুষ্টিকর সাইলেজ খাদ্য প্রযুক্তি, কৃত্রিম প্রজনন ও পশু-ভিত্তিক স্পষ্ট লাভ-ক্ষতি'
        : 'Modern concrete barns, nutrient-dense corn silage, AI breeding, and lifetime animal P&L',
      Icon: Beef,
      meta: bn ? 'সাভার হাব · ডেইরি ও কোরবানি ক্যাটল' : 'Savar Hub · Dairy & Qurbani Feedlot',
      accent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20',
      badgeBg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
      tags: ['অ্যানিমেল ট্যাগ CAT-0001', '১৫-৩০ লিটার দুধ/দিন', 'কোরবানি ষাঁড়ে ৳৬০k+ লাভ', 'সাইলেজে ৪০% সাশ্রয়'],
      desc: bn
        ? 'প্রতিটি গরুর স্বতন্ত্র ট্যাগ, প্রতিদিনের দুধ উৎপাদন, ভ্যাকসিন ক্যালেন্ডার, কৃত্রিম প্রজনন এবং ষাঁড় মোটাতাজাকরণের লাভ-ক্ষতি।'
        : 'Individual animal profiles (CAT-0001), daily milk yield & chilling sales, FMD vaccination history, AI breeding, and beef profit.',
      metrics: [
        { label: bn ? 'দৈনিক দুধ উৎপাদন' : 'Daily Milk Yield', value: bn ? '১৫ - ৩০ লিটার / গাভী' : '15 - 30 Liters / Cow', hint: bn ? 'উন্নত হলস্টেইন ফ্রিজিয়ান জাত' : 'Holstein Friesian cross genetics' },
        { label: bn ? 'কোরবানি ষাঁড়ে লাভ' : 'Beef Net Profit', value: bn ? '৳৪০,০০০ - ৳৮০,০০০ / ষাঁড়' : '৳40,000 - ৳80,000 / Head', hint: bn ? 'প্রতি পশুতে নিট মার্জিন' : 'Net profit per head fattened' },
        { label: bn ? 'খাদ্য খরচ সাশ্রয়' : 'Feed Savings', value: bn ? '৪০% সাইলেজ সাশ্রয়' : '40% Silage Cost Cut', hint: bn ? 'টিএমআর বৈজ্ঞানিক ফরমুলেশন' : 'Via corn silage & TMR mix' },
        { label: bn ? 'বাৎসরিক ROI' : 'Annual ROI', value: '40% - 55%', hint: bn ? 'দুধ, বাছুর ও কোরবানি মিলিয়ে' : 'Blended milk, calf & cattle returns' },
      ],
      startup: {
        heading: bn ? 'কীভাবে আধুনিক ডেইরি ও ক্যাটল খামার শুরু করবেন' : 'How to Launch a Dairy & Beef Cattle Enterprise',
        desc: bn
          ? 'উঁচু ড্রেনেজযুক্ত শেড, ফ্রিজিয়ান/শাহিওয়াল জাত নির্বাচন এবং ভুট্টার সাইলেজ ঘাস চাষের মাধ্যমে শক্তিশালী খামার গড়ে ওঠে।'
          : 'Build high-performing dairy and beef operations through concrete drainage sheds, pedigree genetics, and silage pits.',
        steps: [
          {
            num: '০১',
            title: bn ? 'কংক্রিট শেড ও আলাদা মিল্কিং পার্লার' : 'Concrete Barn, Drainage & Milking Parlor',
            desc: bn
              ? 'উঁচু জায়গায় পূর্ব-পশ্চিমমুখী কংক্রিট মেঝেযুক্ত শেড তৈরি করুন। প্রতি গরুর জন্য ৬০-৮০ বর্গফুট জায়গা, মূত্র ও গোবর নিষ্কাশনের ড্রেন, আলাদা মিল্কিং পার্লার ও বাছুর রাখার কাফ পেন স্থাপন করুন।'
              : 'Construct concrete-floored, well-drained barns oriented east-west. Allocate 60-80 sq ft per adult cattle with designated milking parlors, manure flumes, and isolated calf pens.',
          },
          {
            num: '০২',
            title: bn ? 'উন্নত জাতের গাভী ও এঁড়ে বাছুর নির্বাচন' : 'Breed Genetics Selection (Friesian & Sahiwal)',
            desc: bn
              ? 'ডেইরির জন্য উচ্চ ফলনশীল হলস্টেইন ফ্রিজিয়ান ক্রস বা শাহিওয়াল গাভী (দৈনিক ১৫-২৫ লিটার দুধ); এবং মোটাতাজাকরণের জন্য সুস্থ দেশি-শাহিওয়াল বা ব্রাহমা ক্রস এঁড়ে বাছুর সংগ্রহ করুন।'
              : 'Procure high-milking Holstein Friesian crosses (15-25 L/day) for dairy and muscular Sahiwal/Brahman crosses (180-220 KG start) for intensive feedlot fattening.',
          },
          {
            num: '০৩',
            title: bn ? 'ঘাস ও সাইলেজ চাষ প্রকল্প' : 'Fodder Cultivation & Corn Silage Pits',
            desc: bn
              ? 'নিজস্ব জমিতে হাই-ইল্ডিং নেপিয়ার বা পাকচং ঘাস চাষ করুন এবং কম খরচে উচ্চ পুষ্টির ভুট্টার সাইলেজ (Silage) ড্রামে বা মাটির নিচে পিটে সংরক্ষণ করুন, যা সারা বছরের পুষ্টি নিশ্চিত করে।'
              : 'Cultivate Napier Pakchong grass on captive land and construct airtight corn silage pits or silage drums to secure cheap, protein-rich round-the-year feed.',
          },
          {
            num: '০৪',
            title: bn ? 'প্রারম্ভিক বাণিজ্যিক স্কেল' : 'Prudent Starter Scale & Quarantine',
            desc: bn
              ? '৫-১০টি ডেইরি গাভী অথবা ১০-২০টি মোটাতাজাকরণ ষাঁড় নিয়ে প্রথম ধাপে শুরু করা সবচেয়ে ঝুঁকিমুক্ত। নতুন আনা পশুকে খামারে তোলার আগে ২১ দিন কোয়ারেন্টাইনে রেখে কৃমিনাশক ও টিকা দিন।'
              : 'Begin with 5-10 dairy cows or 10-20 fattening bulls. Enforce a 21-day quarantine with de-worming and initial vaccination before mixing into main barns.',
          },
        ],
      },
      profit: {
        heading: bn ? 'কীভাবে লাভ হয় ও ব্যয়ের অপচয় রোধ করবেন' : 'How Profit is Generated (Operational Secrets)',
        desc: bn
          ? 'ডেইরি ও ক্যাটল ব্যবসায় লাভ মূলত আসে সাইলেজ ব্যবহারে খাদ্যের খরচ কমানো, নিয়মিত কৃত্রিম প্রজনন এবং কোরবানির হাটে প্রিমিয়াম বিক্রয় থেকে।'
          : 'Profit is driven by low-cost silage nutrition, 13-month calving intervals, daily live-weight gain, and festive Qurbani market pricing.',
        points: [
          {
            title: bn ? 'সাইলেজ ব্যবহারে খাদ্যের খরচ ৪০% হ্রাস' : '40% Feed Cost Reduction via Silage & TMR',
            desc: bn
              ? 'শতভাগ দামি বাজারজাত দানাদার খাবারের বদলে নিজস্ব সাইলেজ ও খড়ের সমন্বয়ে তৈরি টিএমআর (Total Mixed Ration) খাওয়ালে দুধ ও মাংস উৎপাদনের খরচ ৪০% কমে যায়।'
              : 'Replacing expensive commercial concentrates with farm-made corn silage and TMR slashes feed costs by 40%, significantly expanding margin per liter of milk.',
            metric: '৪০% ফিড সাশ্রয়',
          },
          {
            title: bn ? 'দৈনিক ১.০ - ১.৩ কেজি মাংস বৃদ্ধি' : 'Daily 1.0 - 1.3 KG Live Weight Gain',
            desc: bn
              ? 'কোরবানির ৪-৬ মাস আগে কম ওজনে ষাঁড় কিনে বৈজ্ঞানিক সুষম খাদ্য ও খৈল-ভূসি প্রয়োগে দ্রুত ওজন বাড়িয়ে হাটে প্রিমিয়াম আকর্ষণীয় মূল্যে বিক্রি করা যায়।'
              : 'Targeted feed rations achieve 1.0-1.3 KG daily live-weight gain over 120-180 days, multiplying the animal asset value by 1.7x for Eid-ul-Adha sale.',
            metric: '১.২ কেজি/দিন বৃদ্ধি',
          },
          {
            title: bn ? 'নিয়মিত কৃত্রিম প্রজনন (AI) ও প্রতি ১৩ মাসে ১টি বাছুর' : 'Timely AI & 13-Month Calving Interval',
            desc: bn
              ? 'সময়মতো গাভী হিটে আনা এবং উন্নত জাতের সিমেন দিয়ে কৃত্রিম প্রজনন ঘটিয়ে প্রতি ১৩-১৪ মাসে একটি করে সুস্থ বাছুর নিশ্চিত করলে খামারের দুগ্ধ উৎপাদন কখনো বন্ধ হয় না।'
              : 'Heat detection and superior AI semen ensure a calving interval of 13-14 months, guaranteeing uninterrupted lactation curves and continuous calf asset creation.',
            metric: 'প্রতি ১৩ মাসে ১ বাছুর',
          },
          {
            title: bn ? 'ক্ষুরারোগ (FMD) ও অ্যানথ্রাক্স প্রতিরোধ' : 'FMD & Anthrax Zero-Loss Biosecurity',
            desc: bn
              ? '৬ মাস পরপর এফএমডি এবং বছরে একবার অ্যানথ্রাক্স ও বাদলা টিকা দিয়ে এবং নিয়মিত লিভার টনিক-কৃমিনাশক দিয়ে পশুর অসুস্থতা ও মৃত্যুঝুঁকি শূন্যে নামিয়ে আনুন।'
              : 'Administer Foot-and-Mouth Disease (FMD) twice annually and Anthrax/Blackleg once. Rigorous parasite management prevents production drops and mortality losses.',
            metric: 'মৃত্যুহার ০%',
          },
        ],
      },
      revenue: {
        heading: bn ? 'কী কী পণ্য, লাভ ও নগদ আয়ের হিসাব' : 'Revenue Streams & Net Profit Breakdown',
        desc: bn
          ? 'প্রতিদিনের তরল খাঁটি দুধ বিক্রি থেকে দৈনিক নগদ ক্যাশফ্লো এবং বছর শেষে কোরবানি ষাঁড় ও বাছুর বিক্রি থেকে এককালীন বড় পুঁজি সৃষ্টি হয়।'
          : 'Enjoy dual cash flows: immediate daily liquidity from raw milk chilling sales and massive lump-sum profits from festive Qurbani bulls and pedigree calves.',
        streams: [
          {
            name: bn ? 'দৈনিক খাঁটি তরল দুধ বিক্রয়' : 'Daily Farm Fresh Raw Milk Offtake',
            rate: bn ? '৳৭০ - ৳৯০ / লিটার' : '৳70 - ৳90 / Liter',
            cycle: bn ? 'প্রতিদিন সকাল ও সন্ধ্যা' : 'Daily twice-a-day cash',
            net: bn ? '১০টি গাভীতে দৈনিক ১৫০-২০০ লিটার = প্রতিদিন ৳১২,০০০-৳১৬,০০০ নগদ ক্যাশফ্লো' : '150-200 L/day from 10 cows = ৳12,000-৳16,000 gross daily cash',
          },
          {
            name: bn ? 'কোরবানির হাটে মোটাতাজা ষাঁড় বিক্রি' : 'Festive Qurbani Prime Bull Offtake',
            rate: bn ? '৳১,৫০,০০০ - ৳৩,৫০,০০০ / ষাঁড়' : '৳150,000 - ৳350,000 / Bull',
            cycle: bn ? 'বাৎসরিক ঈদুল আযহা' : 'Annual Eid season sale',
            net: bn ? 'প্রতি ষাঁড়ে নিট লাভ ৳৪০,০০০ - ৳৮০,০০০ (৫০% - ৮০% মুনাফা মার্জিন)' : '৳40,000 - ৳80,000 pure net profit per bull (50-80% return)',
          },
          {
            name: bn ? 'উন্নত ফ্রিজিয়ান বাছুর ব্রিডিং সেলস' : 'Pedigree Breeding Heifers & Calves',
            rate: bn ? '৳৫০,০০০ - ৳৯০,০০০ / বাছুর' : '৳50,000 - ৳90,000 / Calf',
            cycle: bn ? 'বাৎসরিক ব্রিডিং সেলস' : 'Annual breeding asset sale',
            net: bn ? 'খামারের উদ্বৃত্ত বাছুর বিক্রি থেকে এককালীন বড় মূলধন সৃষ্টি' : 'Direct capital accumulation through heifer multiplier',
          },
          {
            name: bn ? 'বায়োগ্যাস ও ভার্মিকম্পোস্ট জৈব সার' : 'Biogas & Organic Vermicompost Fertilizer',
            rate: bn ? '৳১৮ - ৳২৫ / কেজি সার' : '৳18 - ৳25 / KG Fertilizer',
            cycle: bn ? 'প্রতি মাসে নিয়মিত' : 'Monthly recurring',
            net: bn ? 'গোবর থেকে বায়োগ্যাস চালিয়ে জ্বালানি খরচ শূন্য এবং সার বিক্রি থেকে লাখ টাকা আয়' : 'Zero farm fuel costs via biogas + thousands earned in bagged organic fertilizer',
          },
        ],
        summary: bn
          ? 'আর্থিক সারসংক্ষেপ: ডেইরি ফার্মে প্রতিদিনের দুধ বিক্রি থেকে খামারের সব পরিচালন ব্যয় (শ্রমিক বেতন, ঘাস ও সাইলেজ খরচ) মিটে প্রতিদিন ৳৪,০০০-৳৭,০০০ নগদ নিট প্রফিট বাঁচে। আর বছর শেষে কোরবানি ষাঁড় ও বাছুর বিক্রি থেকে এককালীন ১০-১৫ লাখ টাকার নিট মুনাফা যুক্ত হয়ে বাৎসরিক ৪০-৫৫% ROI নিশ্চিত করে।'
          : 'Financial Summary: Daily milk sales comfortably cover all farm operational overheads (wages, fodder, power) while delivering ৳4,000-৳7,000 daily net surplus. Annual Qurbani beef and pedigree calf sales add ৳10-15 Lakhs lump-sum profit, yielding a 40-55% annualized ROI.',
      },
      erp: {
        title: bn ? 'কৃষিভূমি ইআরপি কীভাবে ডেইরি ও ক্যাটল ফার্ম পরিচালনা করে' : 'How KrishiVumi ERP Powers Dairy & Cattle',
        points: [
          bn ? 'স্বতন্ত্র ডিজিটাল অ্যানিমেল ট্যাগিং (CAT-0001), জাত, জন্মতারিখ, ওজন ও বংশলতিকা ট্র্যাকিং।' : 'Individual digital tag profiles (CAT-0001) tracking breed, pedigree lineage, weight, and health.',
          bn ? 'প্রতিটি গাভীর সকাল-সন্ধ্যার দুধ উৎপাদন রেকর্ড ও দুগ্ধ ক্রেতার বাকি/পরিশোধের স্বয়ংক্রিয় হিসাব।' : 'Twice-daily milk yield logging with automated buyer billing and chilling plant reconciliations.',
          bn ? 'কৃত্রিম প্রজনন (AI) ডেট ও এফএমডি ভ্যাকসিন ক্যালেন্ডার এলার্টসহ প্রতিটি পশুর জীবনব্যাপী লাভ-ক্ষতির খতিয়ান।' : 'Automated heat, AI, and FMD vaccination alert calendar with lifetime individual animal P&L.',
        ],
      },
    },
    {
      id: 'goat' as VerticalId,
      title: bn ? 'ছাগল পালন খামার (বংশলতিকা ও মাচায় লালন-পালন)' : 'Goat Farming & Breeding (Black Bengal & Jamunapari)',
      shortTitle: bn ? 'ছাগল খামার' : 'Goat Farming',
      subtitle: bn ? 'মাচায় ব্ল্যাক বেঙ্গল ও যমুনাপারি ছাগল পালন—স্বল্প পুঁজিতে বহুগুণ বংশবৃদ্ধি' : 'Slatted Elevated Floor Goat Rearing & Family Tree Lineage',
      tagline: bn
        ? 'মাটি থেকে উঁচুতে মাচা শেড, স্বল্প খাদ্যে দ্রুত বংশবৃদ্ধি ও বিশ্বখ্যাত প্রিমিয়াম খাসির মাংসের বাজার'
        : 'Zero-ammonia elevated slatted housing, prolific kidding cycles, and prime live mutton sales',
      Icon: ShieldCheck,
      meta: bn ? 'কুষ্টিয়া হাব · ব্ল্যাক বেঙ্গল ও যমুনাপারি' : 'Kushtia Hub · Black Bengal & Jamunapari',
      accent: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 ring-indigo-500/20',
      badgeBg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
      tags: ['গোট ট্যাগ GOAT-0001', 'বছরে ২ বার বাচ্চা', 'খাসি ৳৭৫০-৳৯৫০/কেজি', '৬০-৮০% বাৎসরিক ROI'],
      desc: bn
        ? 'মাচায় বিজ্ঞানসম্মত ছাগল পালন, মা-বাবার বংশলতিকা ট্র্যাকিং, বাচ্চা জন্মের রেকর্ড, পিপিআর টিকাদান ও খাসি মোটাতাজাকরণ।'
        : 'Individual goat IDs (GOAT-0001), sire/dam family tree tracking, kid birth registries, PPR vaccination, and feed cost attribution.',
      metrics: [
        { label: bn ? 'বংশবৃদ্ধি হার' : 'Kidding Multiplier', value: bn ? 'বছরে ২ বার (২-৪ বাচ্চা)' : '2 Kidding / Year (2-4 Kids)', hint: bn ? 'ব্ল্যাক বেঙ্গলের বিশেষ প্রজনন ক্ষমতা' : 'Black Bengal prolific multiplication' },
        { label: bn ? 'জীবন্ত খাসির দর' : 'Live Weight Rate', value: bn ? '৳৭৫০ - ৳৯৫০ / কেজি' : '৳750 - ৳950 / KG', hint: bn ? 'উচ্চ চাহিদাসম্পন্ন সুস্বাদু মাংস' : 'Premium tender chevon market' },
        { label: bn ? 'খাদ্য খরচ সাশ্রয়' : 'Feed Capex Cut', value: bn ? '৭০% কম খাদ্য খরচ' : '70% Lower Feed Cost', hint: bn ? 'পাতা ও ঘাস নির্ভর লালন-পালন' : 'Forage & foliage based rearing' },
        { label: bn ? 'বাৎসরিক ROI' : 'Annual ROI', value: '60% - 80%', hint: bn ? 'স্বল্প পুঁজিতে দ্বিগুণ মুনাফা' : 'Low capital, exponential returns' },
      ],
      startup: {
        heading: bn ? 'কীভাবে আধুনিক মাচায় ছাগল খামার শুরু করবেন' : 'How to Launch an Elevated Slatted Goat Farm',
        desc: bn
          ? 'মাটি থেকে ৩-৪ ফুট উঁচু মাচা শেড, খাঁটি ব্ল্যাক বেঙ্গল ব্রিডার নির্বাচন এবং সময়মতো পিপিআর টিকাদানের মাধ্যমে সফল খামার শুরু হয়।'
          : 'Setup high-density, low-mortality goat operations using elevated slatted bamboo floors and superior Black Bengal breeders.',
        steps: [
          {
            num: '০১',
            title: bn ? 'উন্নত মাচা শেড (Slatted Elevated Floor)' : 'Elevated Slatted Bamboo/Wood Floor Shed',
            desc: bn
              ? 'মাটি থেকে ৩-৪ ফুট উঁচুতে বাঁশ বা কাঠের মাচা তৈরি করুন যাতে ড্রপিং ও মূত্র নিচে ফাঁক দিয়ে সরাসরি ড্রেনে পড়ে। ছাগলের পা সর্বদা শুকনো ও পরিষ্কার থাকায় সর্দি, ঠাণ্ডা, নিউমোনিয়া ও ক্ষুরা রোগ ৯৫% প্রতিরোধ হয়।'
              : 'Construct raised wooden or bamboo slatted floors 3-4 ft above ground. Droppings and urine fall through slats, keeping hooves completely dry and preventing 95% of respiratory diseases.',
          },
          {
            num: '০২',
            title: bn ? 'খাঁটি ব্ল্যাক বেঙ্গল ও যমুনাপারি নির্বাচন' : 'Black Bengal & Jamunapari Breeder Sourcing',
            desc: bn
              ? 'বাচ্চা উৎপাদনের জন্য খাঁটি দেশি ব্ল্যাক বেঙ্গল (অত্যন্ত দ্রুত বংশবৃদ্ধি, সুস্বাদু মাংস ও বিশ্বসেরা চামড়া) এবং বড় দৈহিক বৃদ্ধি ও দুধের জন্য যমুনাপারি বা তোতাপুরি ব্রিডার নির্বাচন করুন।'
              : 'Select pure indigenous Black Bengal does for high fertility and prized meat quality, or cross with Jamunapari/Boer bucks for accelerated muscle framing.',
          },
          {
            num: '০৩',
            title: bn ? 'সহজলভ্য ফোরেজ ও সুষম খাদ্য' : 'Low-Cost Fodder & Grain Nutrition',
            desc: bn
              ? 'কাঁঠাল পাতা, ইপিল-ইপিল, নেপিয়ার ঘাস এবং সামান্য গমের ভুসি, খৈল ও খনিজ লবণের সুষম খাদ্য তালিকা দিন। পতিত জমির ঘাস ও পাতা খাওয়ার কারণে খাদ্যের খরচ নগণ্য থাকে।'
              : 'Feed fresh jackfruit leaves, Ipyl-Ipyl, Napier, and minimal wheat bran/oilcake concentrate. High forage dependence keeps nutritional overhead remarkably low.',
          },
          {
            num: '০৪',
            title: bn ? 'প্রারম্ভিক পাল স্কেল ও ব্রিডার পাঁঠা' : 'Starter Herd Sizing & Sire Lineage',
            desc: bn
              ? '২০ থেকে ৫০টি সুস্থ মাদী ছাগল এবং উন্নত বংশলতিকার ২টি সক্রিয় ব্রিডার পাঁঠা (Sire) নিয়ে খামার চালু করা সবচেয়ে লাভজনক। নিকটাত্মীয় প্রজনন (Inbreeding) এড়াতে আলাদা পাঁঠা ব্যবহার করুন।'
              : 'Start with 20-50 does and 2 proven, unrelated bucks to prevent inbreeding depression while ramping up herd genetics rapidly.',
          },
        ],
      },
      profit: {
        heading: bn ? 'কীভাবে লাভ হয় ও খরচের নিয়ন্ত্রণ (গোপন সূত্র)' : 'How Profit is Generated (Operational Secrets)',
        desc: bn
          ? 'ছাগল পালনে লাভ মূলত নির্ভর করে ব্ল্যাক বেঙ্গলের চক্রবৃদ্ধি বংশবৃদ্ধি, অত্যন্ত কম খাদ্য খরচ এবং মাচায় শূন্য চিকিৎসা ব্যয়ের ওপর।'
          : 'Goat farm profitability stems from prolific twice-yearly kidding cycles, minimal dietary capex, and zero veterinary medication waste.',
        points: [
          {
            title: bn ? 'চক্রবৃদ্ধি বংশবৃদ্ধি (বছরে পশুর সংখ্যা ৩ গুণ)' : 'Exponential Kidding (3x Herd Multiplier / Year)',
            desc: bn
              ? 'ব্ল্যাক বেঙ্গল ছাগল প্রতি ৮-৯ মাসে বাচ্চা দেয় এবং একবারে ২ থেকে ৪টি পর্যন্ত বাচ্চা দেয়। ফলে মাত্র ১ বছরের মধ্যে খামারের পশুর সংখ্যা দ্বিগুণ থেকে ৩ গুণ বেড়ে যায়।'
              : 'Black Bengal does kid every 8-9 months, frequently bearing 2 to 4 kids per parturition. A 20-doe herd multiplies into 60-80 goats within 14-16 months.',
            metric: '৩ গুণ বংশবৃদ্ধি',
          },
          {
            title: bn ? 'অত্যন্ত স্বল্প খাদ্য ব্যয় (পোল্ট্রি/গরুর চেয়ে ৭০% কম)' : '70% Lower Feed Capex vs Poultry or Dairy',
            desc: bn
              ? 'গাছের ডালপালা, খড়, কাঁঠাল পাতা ও সামান্য দেশি ভুসি খেয়ে বেঁচে থাকায় বাণিজ্যিক ক্যাটল বা পোল্ট্রি ফার্মের তুলনায় ছাগলের খাবার খরচ ৭০% কম।'
              : 'By utilizing wild foliage, crop residues, and minimal grain supplements, goats convert low-grade vegetation into high-value meat at negligible cost.',
            metric: '৭০% খাদ্য সাশ্রয়',
          },
          {
            title: bn ? 'পিপিআর (PPR) ও গোট পক্স টিকাদান' : 'PPR & Goat Pox Immunization Protocol',
            desc: bn
              ? 'পিপিআর (Peste des Petits Ruminants) ও গোট পক্সের টিকা বছরে নিয়মিত দিলে এবং নিয়মিত কৃমিনাশক দিলে মৃত্যুহার ১% এর নিচে রাখা যায়।'
              : 'Timely PPR and Goat Pox vaccines coupled with strategic anthelmintic drenching shield the herd against devastating epidemic mortality.',
            metric: 'মৃত্যুহার < ১%',
          },
          {
            title: bn ? 'মাচায় শুকনো পরিবেশ ও শূন্য ওষুধ খরচ' : 'Slatted Hygiene: Zero Foot-Rot & Cold Medication',
            desc: bn
              ? 'ছাগল স্যাঁতসেঁতে মাটিতে না থাকায় সর্দি, নিউমোনিয়া ও পাতলা পায়খানা হয় না। ফলে ভেটেরিনারি অ্যান্টিবায়োটিক ও ওষুধ খরচ প্রায় সম্পূর্ণ সাশ্রয় হয়।'
              : 'Elevated slatted housing completely eliminates foot rot, parasite reinfection, and pneumonia, cutting veterinary bills by over 90%.',
            metric: '৯০% ওষুধ সাশ্রয়',
          },
        ],
      },
      revenue: {
        heading: bn ? 'কী কী পণ্য, লাভ ও নগদ আয়ের হিসাব' : 'Revenue Streams & Net Profit Breakdown',
        desc: bn
          ? 'ব্রিডিং ছাগল বিক্রি, কোরবানির হাটে প্রিমিয়াম খাসি, আন্তর্জাতিক ব্ল্যাক বেঙ্গল চামড়া এবং জৈব সার থেকে বিপুল মুনাফা অর্জিত হয়।'
          : 'Monetize high-demand pedigree breeding stock, festive Eid castrated bucks, export-grade Bengal skins, and organic nitrogen droppings.',
        streams: [
          {
            name: bn ? 'উন্নত জাতের ব্রিডিং ছাগল ও গর্ভবতী ছাগী বিক্রি' : 'Pedigree Breeding Pairs & Pregnant Does',
            rate: bn ? '৳১৫,০০০ - ৳৩০,০০০ / জোড়া' : '৳15,000 - ৳30,000 / Pair',
            cycle: bn ? '৬ মাস পরপর নিয়মিত' : 'Bi-annual breeding sales',
            net: bn ? 'নতুন খামারিদের কাছে ব্রিডার বিক্রি করে মূলধনের বড় অংশ দ্রুত ফেরত আসে' : 'Rapid capital recuperation from eager regional breeders',
          },
          {
            name: bn ? 'কোরবানি ও মাংসের বড় খাসি বিক্রি' : 'Prime Festive Castrated Bucks (Khasi)',
            rate: bn ? '৳২৫,০০০ - ৳৫০,০০০ / খাসি' : '৳25,000 - ৳50,000 / Buck',
            cycle: bn ? 'ঈদুল আযহা ও সারা বছরের উৎসব' : 'Festive and upscale restaurants',
            net: bn ? 'জীবন্ত ওজনে ৳৭৫০-৳৯৫০/কেজি দরে বিক্রি; প্রতিটি খাসিতে নিট লাভ ৳১৫,০০০+' : 'Live weight ৳750-৳950/KG delivering ৳15,000+ pure margin per buck',
          },
          {
            name: bn ? 'বিশ্ববিখ্যাত ব্ল্যাক বেঙ্গল ছাগলের চামড়া' : 'World-Renowned Black Bengal Raw Hides',
            rate: bn ? 'আন্তর্জাতিক প্রিমিয়াম রেট' : 'Global luxury grade',
            cycle: bn ? 'নিয়মিত সরবরাহ' : 'Consistent slaughter offtake',
            net: bn ? 'চামড়া শিল্পে ব্ল্যাক বেঙ্গলের বিশেষ মসৃণতা ও স্থিতিস্থাপকতায় বাড়তি আয়' : 'Premium price realization from footwear and luxury goods tanneries',
          },
          {
            name: bn ? 'উচ্চ নাইট্রোজেনযুক্ত ছাগলের নাদি সার' : 'Nitrogen-Dense Pure Goat Manure Bags',
            rate: bn ? '৳১৫ - ৳২০ / কেজি' : '৳15 - ৳20 / KG',
            cycle: bn ? 'প্রতি মাসে টনকে টন সংগ্রহ' : 'Monthly bulk collections',
            net: bn ? 'মাছের পুকুর, নার্সারি ও ড্রাগন বাগানের জন্য সবচেয়ে মূল্যবান অর্গানিক সার' : 'High-nitrogen organic fertilizer sold to dragon fruit and aquaculture farms',
          },
        ],
        summary: bn
          ? 'আর্থিক সারসংক্ষেপ: ছাগল পালনে মূলধন কম লাগে কিন্তু বংশবৃদ্ধি হয় অবিশ্বাস্য গতিতে। ২০টি মাদী ছাগল নিয়ে শুরু করলে ২ বছরে খামারে ছাগলের সংখ্যা ৮০-১০০টিতে পৌঁছায়। নিয়মিত খাসি ও ব্রিডার বিক্রি করে মূলধনের ওপর বাৎসরিক ৬০% থেকে ৮০% নিট প্রফিট অর্জন করা সম্পূর্ণ সম্ভব।'
          : 'Financial Summary: Goat farming requires modest initial capex but multiplies capital at an extraordinary compounding rate. A 20-doe foundation scales to 80-100 animals within 24 months, realizing a 60-80% annualized ROI from combined breeding stock and prime mutton sales.',
      },
      erp: {
        title: bn ? 'কৃষিভূমি ইআরপি কীভাবে ছাগল খামার পরিচালনা করে' : 'How KrishiVumi ERP Powers Goat Breeding',
        points: [
          bn ? 'স্বতন্ত্র গোট ট্যাগিং (GOAT-0001), জাত, মা-বাবার নাম ও সম্পূর্ণ বংশলতিকা (Sire/Dam Tree) ট্র্যাকিং।' : 'Individual digital ear tags (GOAT-0001) mapping sire/dam family trees to avoid inbreeding.',
          bn ? 'বাচ্চা প্রসবের তারিখ, বাচ্চার সংখ্যা, জন্মকালীন ওজন ও গ্রোথ লগ স্বয়ংক্রিয়ভাবে সংরক্ষণ।' : 'Kidding records logging birth weights, litter sizes, and monthly weight gains.',
          bn ? 'পিপিআর ও কৃমিনাশক ভ্যাকসিন শিডিউলের স্বয়ংক্রিয় মোবাইল অ্যালার্ট এবং খাসি বিক্রয়ের সাথে সাথে অ্যাকাউন্টিংয়ে ক্যাশ পোস্টিং।' : 'PPR vaccination alerts and instant sales proceeds routing directly to the cash ledger.',
        ],
      },
    },
    {
      id: 'fisheries' as VerticalId,
      title: bn ? 'বিজ্ঞানসম্মত মৎস্য চাষ (পুকুর ও বহু-প্রজাতির কালচার সাইকেল)' : 'Scientific Polyculture Fisheries & Aquaculture',
      shortTitle: bn ? 'মৎস্য চাষ প্রকল্প' : 'Aquaculture Ponds',
      subtitle: bn ? 'পুকুরের প্রতিটি স্তরের সর্বোচ্চ ব্যবহার, ভাসমান খাদ্য ও পানির প্যারামিটার টেলিমেট্রি' : 'Multi-Species Pond Polyculture, Floating Feed & Water Telemetry',
      tagline: bn
        ? 'পুকুরের তলদেশ, মধ্যম ও উপর স্তরে রুই-কাতলা-তেলাপিয়া-পাবদা মিশ্র চাষে রেকর্ড ফলন ও নিশ্চিত লাভ'
        : 'Optimized multi-tier carp & catfish polyculture delivering record yields with zero water fouling',
      Icon: Fish,
      meta: bn ? 'ত্রিশাল, ময়মনসিংহ · ১-৫০ একর কমার্শিয়াল প্রজেক্ট' : 'Trishal Hub · 1-50 Acre Commercial Project',
      accent: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-cyan-500/20',
      badgeBg: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
      tags: ['পুকুর POND-01', 'FCR 1.3-1.5', 'পানি টেলিমেট্রি DO/pH', '৪৫-৬০% নিট মার্জিন'],
      desc: bn
        ? 'পুকুরের সাইজ ও গভীরতা ট্র্যাকিং, মিশ্র পোনা মজুদ, ভাসমান ফিড অপটিমাইজেশন, পানির গুণমান টেলিমেট্রি ও আড়ত বিক্রয়।'
        : 'Pond area & depth registry, multi-species cycles, water quality telemetry (pH, DO, ammonia), floating feed conversion, and harvest cycle profitability.',
      metrics: [
        { label: bn ? 'একর প্রতি ফলন' : 'Yield per Acre', value: bn ? '৩,০০০ - ৬,০০০ কেজি / একর' : '3,000 - 6,000 KG / Acre', hint: bn ? 'বিজ্ঞানসম্মত বহু-প্রজাতির চাষ' : 'Polyculture multi-tier stocking' },
        { label: bn ? 'নিট মুনাফা মার্জিন' : 'Net Margin', value: bn ? '৪৫% - ৬০% নিট লাভ' : '45% - 60% Net Margin', hint: bn ? 'ভাসমান খাবারের দক্ষতায়' : 'High floating feed efficiency' },
        { label: bn ? 'টার্গেট এফসিআর' : 'Target FCR', value: '1.3 - 1.5 FCR', hint: bn ? 'খাদ্যের শূন্য পচন ও সর্বোচ্চ বৃদ্ধি' : 'Zero feed decay, rapid biomass' },
        { label: bn ? 'হারভেস্ট সাইকেল' : 'Harvest Cycle', value: bn ? '৬ - ৮ মাস' : '6 - 8 Months', hint: bn ? 'পর্যায়ক্রমিক নেট টানা ও বিক্রি' : 'Phased netting & bulk offload' },
      ],
      startup: {
        heading: bn ? 'কীভাবে বিজ্ঞানসম্মত মৎস্য চাষ প্রকল্প শুরু করবেন' : 'How to Launch a Scientific Polyculture Fisheries Project',
        desc: bn
          ? 'তলদেশের বিষাক্ত গ্যাস অপসারণ, চুন প্রয়োগ, বহু-স্তরের পোনা নির্বাচন এবং অক্সিজেন অ্যারোটর স্থাপনের মাধ্যমে আধুনিক মৎস্য প্রকল্প গড়ে ওঠে।'
          : 'Build high-yield aquaculture through pond detoxification, liming, multi-depth stocking, and paddlewheel aeration.',
        steps: [
          {
            num: '০১',
            title: bn ? 'বৈজ্ঞানিক পুকুর প্রস্তুতি ও চুন প্রয়োগ' : 'Pond Drainage, Mud Removal & Liming',
            desc: bn
              ? 'পুকুর সম্পূর্ণ শুকিয়ে তলদেশের অতিরিক্ত বিষাক্ত কালো কাদা অপসারণ করুন। প্রতি শতাংশে ১ কেজি চুন ও গোবর প্রয়োগ করে মাটির pH ও প্রাকৃতিক প্ল্যাঙ্কটন প্রস্তুত করুন এবং ৫-৬ ফুট স্বচ্ছ পানি দিয়ে পূর্ণ করুন।'
              : 'Drain ponds completely and clear toxic bottom mud. Apply 1 KG agricultural lime and organic cow dung per decimal to balance soil pH and spur natural zooplankton blooms.',
          },
          {
            num: '০২',
            title: bn ? 'বহু-প্রজাতির পোনা মিশ্রণ (Polyculture Mix)' : 'Multi-Depth Fingerling Stocking Ratio',
            desc: bn
              ? 'পানির খাদ্য স্তরের সর্বোচ্চ ব্যবহারের জন্য উপর স্তরে কাতলা ও সিলভার কার্প; মধ্য স্তরে রুই ও মৃগেল; এবং তলদেশে কার্পিও ও গ্রাস কার্প মজুদ করুন। পাড়ে বা খাঁচায় দ্রুত বর্ধনশীল পাবদা, গুলশা বা তেলাপিয়া রাখুন।'
              : 'Stock surface feeders (Catla/Silver Carp), column feeders (Rui/Mrigal), and bottom cleaners (Carpio/Pangasius). Integrate cage or fringe monoculture for high-value Pabda/Gulsha.',
          },
          {
            num: '০৩',
            title: bn ? 'অক্সিজেন অ্যারোটর স্থাপন' : 'Paddlewheel Aerator Telemetry Installation',
            desc: bn
              ? 'ডিপ-ওয়াটার প্যাডেল হুইল বা ড্রিবলার অ্যারোটর স্থাপন করুন। রাতে ও ভোরে অ্যারোটর চালালে পানিতে দ্রবীভূত অক্সিজেন সর্বদা ৫ মিলিগ্রাম/লিটারের উপরে থাকে, ফলে মাছের বৃদ্ধি দ্বিগুণ হয় এবং রোগ হয় না।'
              : 'Install electric paddlewheel or air-injector aerators. Running them during pre-dawn hours keeps Dissolved Oxygen (DO) above 5 mg/L, doubling fish stocking capacity safely.',
          },
          {
            num: '০৪',
            title: bn ? 'প্রারম্ভিক প্রকল্প স্কেল' : 'Commercial Scale & Water Nursery',
            desc: bn
              ? '১ থেকে ৩ একরের পুকুর বা দিঘি নিয়ে বাণিজ্যিক মৎস্য চাষ শুরু করা সবচেয়ে লাভজনক। সরাসরি পুকুরে ছাড়ার আগে নার্সারি পুকুরে আঙুলিপোনা তৈরি করে নিলে পোনার বাঁচার হার ৯৮% নিশ্চিত হয়।'
              : 'Commence with 1-3 acres of waterbody. Acclimatize fingerlings in an adjacent nursery pond to ensure a 98% survival rate before releasing them into grow-out ponds.',
          },
        ],
      },
      profit: {
        heading: bn ? 'কীভাবে লাভ হয় ও খরচের নিয়ন্ত্রণ (গোপন সূত্র)' : 'How Profit is Generated (Operational Secrets)',
        desc: bn
          ? 'মাছ চাষে লাভের আসল রহস্য হলো ভাসমান ফিড ব্যবহার করে খাবারের অপচয় শূন্য রাখা এবং বহু স্তরের মাছের পরস্পর সহযোগী খাদ্য চক্র তৈরি করা।'
          : 'Aquaculture profitability relies on floating extruded feed efficiency, multi-tier waste recycling, and proactive water telemetry.',
        points: [
          {
            title: bn ? 'ভাসমান ফিড ব্যবহারে FCR ১.৩ - ১.৫ নিশ্চিতকরণ' : 'Floating Extruded Feed & FCR 1.3 - 1.5 Target',
            desc: bn
              ? 'ডুবন্ত খাবারের মতো ভাসমান খাবার পানির নিচে গিয়ে পচে না। মাছ ভেসে উঠে খাবার খাওয়ায় খাবারের কোনো অংশই নষ্ট হয় না, ফলে FCR ১.৩ এর নিচে নেমে এসে লাখ লাখ টাকা সাশ্রয় করে।'
              : 'Unlike sinking mash, floating extruded pellets never sink to rot. Farmers see exactly what fish consume, keeping FCR around 1.3-1.5 and preventing costly water fouling.',
            metric: 'FCR < 1.5',
          },
          {
            title: bn ? 'বহুমাত্রিক স্তরের সহাবস্থান (খাবার খরচ ২৫% সাশ্রয়)' : 'Ecological Multi-Tier Feed Recycling (25% Savings)',
            desc: bn
              ? 'উপরের স্তরের মাছের মল ও অপরিপাককৃত খাবার মধ্যম ও নিচের স্তরের মাছ খাদ্য হিসেবে গ্রহণ করে। এতে পুকুরে সম্পূরক খাদ্যের খরচ ২৫% কমে যায় এবং উৎপাদন বৃদ্ধি পায়।'
              : 'Waste and metabolic excretion from upper-tier fish serve as biological nutrition for bottom and benthic feeders, cutting supplementary feeding expenditure by 25%.',
            metric: '২৫% ফিড সাশ্রয়',
          },
          {
            title: bn ? 'পানির প্যারামিটার (DO, pH, Ammonia) নিয়ন্ত্রণ' : 'Real-Time DO, pH & Ammonia Telemetry',
            desc: bn
              ? 'ডিজিটাল মিটারে নিয়মিত পানির pH (৭.৫-৮.৫), দ্রবীভূত অক্সিজেন (DO > 5 mg/L) এবং ক্ষতিকর গ্যাস মনিটরিং করে প্রোবায়োটিক ব্যবহার করলে মাছের বৃদ্ধি দ্রুত হয় এবং রোগবালাই হয় না।'
              : 'Maintaining optimal water parameters (pH 7.5-8.5, DO > 5 mg/L, Ammonia < 0.02 mg/L) using regular probiotics accelerates growth cycles by 30%.',
            metric: 'DO > 5 mg/L',
          },
          {
            title: bn ? 'পাক্ষিক স্যাম্পলিং ও খাবার রেশনিং' : 'Fortnightly Biomass Sampling & Feed Dosage',
            desc: bn
              ? 'প্রতি ১৫ দিনে জাল টেনে মাছের গড় ওজন মেপে মাছের মোট বায়োমাসের ২-৩% হারে খাদ্য দিলে অতিরিক্ত খাবারের অপচয় শতভাগ বন্ধ থাকে।'
              : 'Sampling average fish weights every 15 days ensures feed rations are matched precisely to live biomass (2-3%), eliminating feed dumping and maximizing profit.',
            metric: '১৫ দিনে স্যাম্পলিং',
          },
        ],
      },
      revenue: {
        heading: bn ? 'কী কী পণ্য, লাভ ও নগদ আয়ের হিসাব' : 'Revenue Streams & Net Profit Breakdown',
        desc: bn
          ? 'আড়তে বাণিজ্যিক হারভেস্ট সেলস, সাপ্তাহিক নগদ পাইকারি বিক্রি, আঙুলিপোনা নার্সারি এবং পুকুর পাড়ে ফলমূল চাষ থেকে বহুমুখী লাভ আসে।'
          : 'Monetize seasonal mega harvests, weekly netting cash liquidity, fingerling nursery production, and zero-cost pond dyke agro crops.',
        streams: [
          {
            name: bn ? 'বাণিজ্যিক আড়ত হারভেস্ট সেলস' : 'Commercial Wholesale Market Harvest',
            rate: bn ? '৳১৮০ - ৳৪৫০ / কেজি (প্রজাতিভেদে)' : '৳180 - ৳450 / KG (species specific)',
            cycle: bn ? '৬-৮ মাসের চাষ চক্র' : '6-8 month cycle',
            net: bn ? 'প্রতি একরে ৩,০০০-৬,০০০ কেজি মাছ উৎপাদনে ১০-১৫ লাখ টাকার বড় আড়ত সেলস' : '3,000-6,000 KG/acre generating ৳10-15 Lakhs gross revenue per cycle',
          },
          {
            name: bn ? 'সাপ্তাহিক নগদ আড়ত ক্যাশফ্লো' : 'Weekly Live Netting Cash Flow',
            rate: bn ? '৳২০০ - ৳৩৫০ / কেজি' : '৳200 - ৳350 / KG live',
            cycle: bn ? 'প্রতি সপ্তাহে আংশিক জাল টানা' : 'Weekly partial netting',
            net: bn ? 'বড় পুকুরে প্রতি সপ্তাহে তাজা মাছ বিক্রি করে তাৎক্ষণিক নিয়মিত নগদ ফান্ড' : 'Regular weekly cash injections to fund operational labor and feed replenishment',
          },
          {
            name: bn ? 'ধানী পোনা থেকে নার্সারি আঙুলিপোনা বিক্রি' : 'Nursery Fingerling Multiplication Sales',
            rate: bn ? '৩ গুণ মুনাফা মার্জিন' : '3x Fingerling Markup',
            cycle: bn ? '২-৩ মাসের নার্সারি সাইকেল' : '2-3 month nursery cycle',
            net: bn ? 'ছোট পুকুরে আঙুলিপোনা তৈরি করে স্থানীয় চাষিদের কাছে বিক্রি করে দ্রুত লাভ' : 'High-margin cash generated from selling hardened fingerlings to neighboring farms',
          },
          {
            name: bn ? 'পুকুর পাড়ে সমন্বিত পেঁপে, লাউ ও কলা চাষ' : 'Integrated Pond Dyke Vegetable & Fruit Cash Crops',
            rate: bn ? 'ফ্রেশ অর্গানিক পাইকারি দর' : 'Direct organic wholesale',
            cycle: bn ? 'সারা বছর নিয়মিত ফসল' : 'Year-round harvest',
            net: bn ? 'পুকুর পাড়ের ফেলে রাখা জায়গায় আধুনিক ফলমূল চাষ করে বছরে লাখ টাকার বাড়তি লাভ' : 'Captive dyke papaya, banana, and bottle gourd harvesting adds ৳1-2 Lakhs free profit',
          },
        ],
        summary: bn
          ? 'আর্থিক সারসংক্ষেপ: বিজ্ঞানসম্মত বহু-প্রজাতির মৎস্য চাষে প্রতি একরে ৩ থেকে ৬ টন মাছ উৎপাদিত হয়। সাপ্তাহিক আংশিক বিক্রয়ে নিয়মিত নগদ টাকা পাওয়া যায় এবং চূড়ান্ত হারভেস্টে ফিড ও পোনার মোট ব্যয় বাদ দিয়ে ৪৫% থেকে ৬০% নিট মুনাফা অর্জিত হয়।'
          : 'Financial Summary: Multi-species scientific polyculture yields 3 to 6 metric tons per acre. Weekly netting keeps cash flow liquid while final cycle harvesting delivers an audited 45-60% net profit margin after all feed, power, and lease expenses.',
      },
      erp: {
        title: bn ? 'কৃষিভূমি ইআরপি কীভাবে মৎস্য প্রকল্প পরিচালনা করে' : 'How KrishiVumi ERP Powers Fisheries Ponds',
        points: [
          bn ? 'প্রতিটি পুকুরের স্বতন্ত্র প্রোফাইল (POND-01), আয়তন, গভীরতা ও বহু-প্রজাতির পোনা স্টক রেজিস্ট্রি।' : 'Individual pond profiles (POND-01) mapping area, water depth, and multi-tier stocking counts.',
          bn ? 'পানির pH, অ্যামোনিয়া ও দ্রবীভূত অক্সিজেন (DO) টেলিমেট্রি লগ এবং স্বয়ংক্রিয় ফিডিং চার্ট।' : 'Water telemetry logging (pH, DO, ammonia) coupled with daily feed conversion ratios.',
          bn ? 'আড়তে মাছ বিক্রয়ের ডিজিটাল ইনভয়েস ও কমিশন বাদ দিয়ে নিট বিক্রয়মূল্য সরাসরি ব্যাংক/ক্যাশ অ্যাকাউন্টে জমা।' : 'Digital fish wholesale commission invoicing with instant proceeds posted to Cash & Bank ledgers.',
        ],
      },
    },
    {
      id: 'transport' as VerticalId,
      title: bn ? 'বাণিজ্যিক ট্রাক ও পরিবহন ফ্লিট (হাইওয়ে লজিস্টিকস ও নিজস্ব পণ্য সরবরাহ)' : 'Commercial Truck Fleet & Agro Logistics',
      shortTitle: bn ? 'ট্রাক ও পরিবহন ফ্লিট' : 'Fleet Logistics',
      subtitle: bn ? 'জাতীয় মহাসড়কে নিজস্ব খামারের পণ্য পরিবহন ও দ্বিমুখী ব্যাকহলে নিশ্চিত লাভ' : 'National Highway Fleet Operations, Dual-Leg Freight & Low Deadhead Miles',
      tagline: bn
        ? 'নিজস্ব কাভার্ড ভ্যানে পণ্য পরিবহন করে সময় ও গুণগত মান রক্ষা এবং ফেরার পথে দ্বিমুখী ভাড়ায় নিশ্চিত মুনাফা'
        : 'Captive farm supply chain protection, BRTA compliance, and high-margin highway backhaul trips',
      Icon: Truck,
      meta: bn ? 'তেজগাঁও সেন্ট্রাল হাব · জাতীয় মহাসড়ক নেটওয়ার্ক' : 'Tejgaon HQ · National Highway Corridors',
      accent: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 ring-sky-500/20',
      badgeBg: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
      tags: ['ভেহিকেল TRK-01', '৳১২k-৳২২k নিট লাভ/ট্রিপ', 'বিআরটিএ এলার্ট', '২-৩ বছরে পূর্ণ পে-ব্যাক'],
      desc: bn
        ? 'গাড়ির রেজিস্ট্রেশন, বিআরটিএ ফিটনেস/ট্যাক্স টোকেন মেয়াদ রিমাইন্ডার, ট্রিপ-ভিত্তিক ডিজেল, টোল, ড্রাইভার ভাতা এবং নিট ট্রিপ মুনাফা।'
        : 'Vehicle registry, BRTA Fitness/Tax Token expiry alerts, trip-wise fuel, bridge tolls, driver allowance, maintenance, and trip profitability.',
      metrics: [
        { label: bn ? 'প্রতি ট্রিপে নিট লাভ' : 'Net Profit / Trip', value: bn ? '৳১২,০০০ - ৳২২,০০০' : '৳12,000 - ৳22,000', hint: bn ? 'ডিজেল ও সেতু টোল বাদে' : 'After fuel, tolls & driver pay' },
        { label: bn ? 'প্রতি ট্রাকে বাৎসরিক আয়' : 'Annual Net / Truck', value: bn ? '৳৮,০০,০০০ - ৳১২,০০,০০০' : '৳8,00,000 - ৳12,00,000', hint: bn ? 'সব মেইনটেন্যান্স বাদ দিয়ে' : 'Net earnings per vehicle/year' },
        { label: bn ? 'পুঁজি ফেরত পে-ব্যাক' : 'Capex Payback', value: bn ? '২ - ৩ বছর' : '2 - 3 Years', hint: bn ? 'পুরো গাড়ির ক্রয়মূল্য ফেরত' : 'Full commercial vehicle payback' },
        { label: bn ? 'ফ্লিট ইউটিলাইজেশন' : 'Fleet Utilization', value: bn ? '৯০%+ ব্যাকহল সহ' : '90%+ with Backhaul', hint: bn ? 'খালি গাড়ি না চালিয়ে দ্বিমুখী ভাড়া' : 'Zero deadhead empty runs' },
      ],
      startup: {
        heading: bn ? 'কীভাবে বাণিজ্যিক এগ্রো পরিবহন ফ্লিট শুরু করবেন' : 'How to Launch a Commercial Agro Logistics Fleet',
        desc: bn
          ? 'সঠিক বাণিজ্যিক কাভার্ড ভ্যান নির্বাচন, বিআরটিএ কমার্শিয়াল অনুমোদন এবং জিপিএস ট্র্যাকিং ও দক্ষ চালক নিয়োগের মাধ্যমে আধুনিক ফ্লিট গড়ে ওঠে।'
          : 'Setup commercial logistics through reliable covered vans, refrigerated chillers, BRTA permits, and IoT GPS telemetry.',
        steps: [
          {
            num: '০১',
            title: bn ? 'বাণিজ্যিক কাভার্ড বা কুলিং ভ্যান সংগ্রহ' : 'Commercial Covered Van or Refrigerated Chiller',
            desc: bn
              ? '৩ টন, ৫ টন বা ৭.৫ টন নির্ভরযোগ্য কমার্শিয়াল কাভার্ড ভ্যান সংগ্রহ করুন। তাজা দুধ, পোল্ট্রি মাংস বা মাছ পরিবহনের জন্য প্রয়োজনে ইনসুলেটেড অথবা রেফ্রিজারেটেড কুলিং ভ্যান নির্বাচন করুন।'
              : 'Acquire robust 3-ton, 5-ton, or 7.5-ton covered vans. For fresh milk, dressed poultry, or live fish transport, equip insulated containers or thermal chilling compressors.',
          },
          {
            num: '০২',
            title: bn ? 'বিআরটিএ রেজিস্ট্রেশন ও রুট পারমিট' : 'BRTA Registration & Highway Route Permits',
            desc: bn
              ? 'বিআরটিএ থেকে বাণিজ্যিক রেজিস্ট্রেশন, ডিজিটাল ফিটনেস সার্টিফিকেট, হাইওয়ে রুট পারমিট, ট্যাক্স টোকেন ও কমার্শিয়াল ইন্স্যুরেন্স নিশ্চিত করুন যাতে হাইওয়েতে কোনো আইনি জটিলতা না হয়।'
              : 'Complete commercial BRTA registration, annual fitness certifications, highway route permits, commercial tax tokens, and full-coverage transit insurance.',
          },
          {
            num: '০৩',
            title: bn ? 'দক্ষ চালক ও জিপিএস ভেহিকেল ট্র্যাকার' : 'Driver Recruitment & Live GPS Fuel Telemetry',
            desc: bn
              ? 'অভিজ্ঞ হেভি/মিডিয়াম লাইসেন্সধারী চালক নিয়োগ করুন এবং গাড়িতে রিয়েল-টাইম জিপিএস ট্র্যাকার ও ফুয়েল মনিটরিং সেন্সর স্থাপন করুন যাতে গতি ও তেল চুরি বন্ধ করা যায়।'
              : 'Hire vetted commercial heavy/medium license holders. Install live GPS tracking units and fuel tank sensors to eliminate pilferage and monitor driving efficiency.',
          },
          {
            num: '০৪',
            title: bn ? 'প্রারম্ভিক ফ্লিট স্কেল' : 'Starter Fleet Sizing (1 to 3 Units)',
            desc: bn
              ? 'শুরুতে ১ থেকে ৩টি বাণিজ্যিক কাভার্ড ভ্যান নিয়ে অপারেশন চালু করা সবচেয়ে লাভজনক। নিজস্ব খামারের পণ্য পরিবহন নিশ্চিত করার পর বাকি সময় বাণিজ্যিক ফ্রেইট ভাড়া দেওয়া যায়।'
              : 'Launch with 1 to 3 units. Prioritize captive farm transport needs first, then deploy surplus truck hours onto high-demand highway commercial freight corridors.',
          },
        ],
      },
      profit: {
        heading: bn ? 'কীভাবে লাভ হয় ও খরচের নিয়ন্ত্রণ (গোপন সূত্র)' : 'How Profit is Generated (Operational Secrets)',
        desc: bn
          ? 'পরিবহন ব্যবসায় লাভ মূলত নির্ভর করে খালি গাড়ি না চালিয়ে দ্বিমুখী ব্যাকহল ভাড়া নিশ্চিত করা এবং তেল চুরি ও অনাকাঙ্ক্ষিত ব্রেকডাউন রোধ করার ওপর।'
          : 'Fleet profitability is maximized by eliminating empty backhauls, auditing fuel mileage, and adhering to strict preventive maintenance.',
        points: [
          {
            title: bn ? 'দ্বিমুখী ব্যাকহল (Round-Trip) দ্বিগুণ ভাড়া নিশ্চিতকরণ' : 'Dual-Leg Backhaul Freight Utilization (Zero Deadhead)',
            desc: bn
              ? 'খামার থেকে ঢাকা বা চট্টগ্রামে মাছ, মুরগি বা দুধ সরবরাহ করার পর ফেরার পথে খালি গাড়ি না এনে ফিড মিল থেকে ভুট্টা, সয়াবিন ও ফিডের বস্তা লোড করে এনে দ্বিমুখী ভাড়া নিশ্চিত করুন।'
              : 'Never return empty. After delivering farm produce to Dhaka or Chittagong, pick up return cargo (feed ingredients, soybeans, industrial goods) for high-margin double billing.',
            metric: 'দ্বিমুখী ভাড়া',
          },
          {
            title: bn ? 'ডিজেল ও সেতু টোল ডিজিটাল অডিট' : 'Digital Fuel Mileage & Bridge Toll Reconciliations',
            desc: bn
              ? 'ইআরপির মাধ্যমে প্রতি কিলোমিটারে মাইলেজ মনিটরিং এবং পদ্মা বা বঙ্গবন্ধু সেতুর টোল ডিজিটাল ভাউচারের সাথে যাচাই করে তেল চুরি ও অতিরিক্ত খরচ শতভাগ বন্ধ রাখা যায়।'
              : 'Track KM/liter fuel consumption against GPS logs and reconcile toll charges digitally, completely stamping out driver expense inflation and fuel leakage.',
            metric: 'তেল চুরি ০%',
          },
          {
            title: bn ? 'প্রিভেন্টিভ মেইনটেন্যান্স (PM) শিডিউল' : 'Scheduled Preventive Maintenance (PM)',
            desc: bn
              ? 'নির্দিষ্ট ৫,০০০ কিমি অন্তর ইঞ্জিন অয়েল, ফিল্টার, টায়ার প্রেশার ও ব্রেক শু পরিবর্তন করলে মহাসড়কে অনাকাঙ্ক্ষিত গাড়ি নষ্ট হওয়া এবং কোটি টাকার পণ্য পচে যাওয়ার ঝুঁকি থাকে না।'
              : 'Strict 5,000-KM preventive lube, oil, and brake overhauls prevent high-cost highway breakdowns and protect perishable cargo from spoilage.',
            metric: 'ব্রেকডাউন ০%',
          },
          {
            title: bn ? 'কর্পোরেট দীর্ঘমেয়াদী ফ্রেইট চুক্তি' : 'Dedicated Monthly Corporate Freight Contracts',
            desc: bn
              ? 'শীর্ষস্থানীয় এগ্রো ও এফএমসিজি কোম্পানির সাথে ফিক্সড রুটে মাসিক চুক্তিতে গাড়ি চালালে গাড়ির অলস বসে থাকার সময় শূন্যে নেমে আসে।'
              : 'Securing dedicated monthly freight contracts with feed mills and FMCG distributors guarantees steady revenue regardless of seasonal fluctuations.',
            metric: 'স্থায়ী মাসিক চুক্তি',
          },
        ],
      },
      revenue: {
        heading: bn ? 'কী কী পণ্য, লাভ ও নগদ আয়ের হিসাব' : 'Revenue Streams & Net Profit Breakdown',
        desc: bn
          ? 'হাইওয়ে ট্রিপ ভাড়া, নিজস্ব খামারের লাখ লাখ টাকার পণ্য রক্ষা এবং ডেডিকেটেড কর্পোরেট চুক্তি থেকে নিয়মিত উচ্চ নগদ ক্যাশফ্লো আসে।'
          : 'Capture highway freight charges, save massive outside trucking fees, and establish fixed monthly fleet billing contracts.',
        streams: [
          {
            name: bn ? 'হাইওয়ে রাউন্ড-ট্রিপ ফ্রেইট ভাড়া' : 'Highway Round-Trip Commercial Freight',
            rate: bn ? '৳২৫,০০০ - ৳৪৫,০০০ / ট্রিপ' : '৳25,000 - ৳45,000 / Trip',
            cycle: bn ? 'ঢাকা-চট্টগ্রাম / ঢাকা-বগুড়া করিডোর' : 'Dhaka-Chittagong-Bogra corridor',
            net: bn ? 'ডিজেল, টোল ও চালকের ভাতা বাদ দিয়ে প্রতি ট্রিপে নিট লাভ ৳১২,০০০-৳২২,০০০' : '৳12,000-৳22,000 pure net profit per trip after fuel, tolls, and driver commission',
          },
          {
            name: bn ? 'নিজস্ব খামারের কোটি টাকার পণ্য রক্ষা ও সাশ্রয়' : 'Captive Farm Supply Chain Cost Savings',
            rate: bn ? 'সময়মতো আড়তে ডেলিভারি' : 'Immediate fresh transit',
            cycle: bn ? 'প্রতিদিনের খামার অপারেশন' : 'Daily farm dispatch',
            net: bn ? 'বাইরের ট্রাকের চড়া ভাড়া ও ইচ্ছাকৃত দেরি ছাড়াই পণ্য তাজা পৌঁছে লাখ লাখ টাকা সাশ্রয়' : 'Eliminate extortionate third-party freight fees and protect perishable produce value',
          },
          {
            name: bn ? 'মাসিক ডেডিকেটেড কর্পোরেট ফ্রেইট চুক্তি' : 'Dedicated Corporate Monthly Freight Contracts',
            rate: bn ? '৳১,৫০,০০০ - ৳২,৫০,০০০ / মাস' : '৳150,000 - ৳250,000 / Month',
            cycle: bn ? 'মাসিক স্থায়ী চুক্তি' : 'Monthly recurring retainer',
            net: bn ? 'ফিড কোম্পানি বা রিটেইল চেইনের সাথে স্থায়ী রুটে নিশ্চিত মাসিক নগদ ক্যাশফ্লো' : 'Guaranteed predictable baseline liquidity through long-term corporate agreements',
          },
          {
            name: bn ? 'স্থায়ী বাণিজ্যিক অ্যাসেট ও দ্রুত পে-ব্যাক' : 'Rapid Capital Payback & Permanent Fleet Asset',
            rate: bn ? 'স্থায়ী সম্পদ মূল্য' : 'Appreciating physical asset',
            cycle: bn ? '২-৩ বছরের পে-ব্যাক' : '2-3 year full capex payback',
            net: bn ? 'প্রতি ট্রাকে বছরে ৮ থেকে ১২ লাখ টাকা নিট লাভে আড়াই বছরে পুরো গাড়ির মূল্য ফেরত' : 'Full vehicle purchase price fully recovered within 24-30 months of operation',
          },
        ],
        summary: bn
          ? 'আর্থিক সারসংক্ষেপ: একটি বাণিজ্যিক কাভার্ড ভ্যান নিজস্ব খামারের পণ্য পরিবহন নিরাপদ করার পাশাপাশি হাইওয়ে ব্যাকহল ট্রিপে প্রতি ট্রিপে ৳১২,০০০-৳২২,০০০ নিট লাভ এনে দেয়। প্রতিটি গাড়িতে বছরে ৮ থেকে ১২ লাখ টাকা সম্পূর্ণ নিট ক্যাশ প্রফিট অর্জিত হয়, ফলে আড়াই থেকে ৩ বছরের মধ্যেই পুরো গাড়ির পুঁজিসহ শতভাগ বিনিয়োগ ফেরত আসে।'
          : 'Financial Summary: A single commercial covered van safeguards internal farm logistics while netting ৳12,000 - ৳22,000 profit per highway round trip. Generating ৳8 to 12 Lakhs annual net profit, the entire vehicle investment is fully amortized within 2.5 to 3 years.',
      },
      erp: {
        title: bn ? 'কৃষিভূমি ইআরপি কীভাবে পরিবহন ফ্লিট পরিচালনা করে' : 'How KrishiVumi ERP Powers Fleet Logistics',
        points: [
          bn ? 'ভেহিকেল রেজিস্ট্রি (TRK-01), চালকের লাইসেন্স ও বিআরটিএ ফিটনেস/ট্যাক্স টোকেনের মেয়াদের স্বয়ংক্রিয় রিমাইন্ডার।' : 'Vehicle registry (TRK-01), driver profiles, and automated BRTA Fitness/Tax Token expiry alerts.',
          bn ? 'ট্রিপ-ভিত্তিক ডিজেল লিটার, কিলোমিটার মাইলেজ ও সেতু টোল খরচের ডিজিটাল ভাউচার হিসাব।' : 'Trip-wise diesel consumption, KM mileage tracking, and digital bridge toll reconciliations.',
          bn ? 'প্রতি ট্রিপের মোট ভাড়া থেকে সব খরচ বাদ দিয়ে গাড়ির স্বয়ংক্রিয় নিট ট্রিপ প্রফিট ও সেন্ট্রাল লেজারে পোস্টিং।' : 'Automatic per-trip net profitability reporting with immutable postings to Central Ledger.',
        ],
      },
    },
    {
      id: 'custom' as VerticalId,
      title: bn ? 'ডাইনামিক কাস্টম বিজনেস উইজার্ড (জিরো-কোড এন্টারপ্রাইজ সম্প্রসারণ)' : 'Zero-Code Dynamic Business Provisioning Wizard',
      shortTitle: bn ? 'কাস্টম বিজনেস উইজার্ড' : 'Custom Wizard',
      subtitle: bn ? 'সুপার অ্যাডমিনের জন্য ১ ক্লিকে যেকোনো নতুন এগ্রো-ইন্ডাস্ট্রিয়াল বিজনেস ইউনিট তৈরি' : 'Launch Any Custom Agro Unit with Isolated Workflows & Auto-Ledger',
      tagline: bn
        ? 'ফিড মিল, রাইস ট্রেডিং, কোল্ড স্টোরেজ, অর্গানিক রিটেইল শপ বা সার ডিস্ট্রিবিউশন তাৎক্ষণিক চালু করুন'
        : 'Provision feed mills, grain trading, cold chain, or retail outlets with instant chart of accounts',
      Icon: Layers,
      meta: bn ? 'সুপার অ্যাডমিন কনসোল · সীমাহীন ব্যবসা' : 'Super Admin Console · Unlimited Businesses',
      accent: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-500/20',
      badgeBg: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30',
      tags: ['১-ক্লিক উইজার্ড', 'কাস্টম চার্ট অব অ্যাকাউন্টস', 'আইসোলেটেড ডাটা', 'সেন্ট্রাল ট্রেজারি'],
      desc: bn
        ? 'সুপার অ্যাডমিন ১ ক্লিকে ডেইরি প্রোডাক্টস, ফিশ ফিড মিল, রাইস ট্রেডিং, সবজি পাইকারি বা রিটেইল শপ চালু করতে পারবেন।'
        : 'Super Admins can launch Dairy Products, Fish Feed Mills, Rice Trading, Vegetable Wholesale, or Retail units instantly via the provisioning wizard.',
      metrics: [
        { label: bn ? 'সেটআপ সময়' : 'Setup Speed', value: bn ? 'মাত্র ২ মিনিট' : 'Instant 2 Minutes', hint: bn ? 'জিরো-কোড অ্যাডমিন কনফিগারেশন' : 'Zero-code browser wizard' },
        { label: bn ? 'লেজার ইন্টিগ্রেশন' : 'Ledger Sync', value: bn ? '১০০% স্বয়ংক্রিয়' : '100% Auto-Ledger', hint: bn ? 'ব্যালেন্সড ডাবল-এন্ট্রি হিসাব' : 'Enforces balanced entries' },
        { label: bn ? 'ব্যবসার পরিধি' : 'Enterprise Scope', value: bn ? 'সীমাহীন ব্যবসা' : 'Unlimited Businesses', hint: bn ? 'যেকোনো কৃষি ও ট্রেডিং উদ্যোগ' : 'Feed mills, retail, cold storage' },
        { label: bn ? 'অডিট ও নিরাপত্তা' : 'Audit Trail', value: bn ? '৩-স্তরের আরবিএসি' : '3-Tier RBAC Ready', hint: bn ? 'আইসোলেটেড পারমিশন রুলস' : 'Role-based access boundaries' },
      ],
      startup: {
        heading: bn ? 'কীভাবে নতুন কাস্টম ব্যবসা চালু করবেন' : 'How to Provision a Custom Business Unit',
        desc: bn
          ? 'কোনো কোডিং বা ডেভেলপার ছাড়াই সুপার অ্যাডমিন কনসোল থেকে মুহূর্তে যেকোনো নতুন এগ্রো বা ট্রেডিং ব্যবসা তৈরি করুন।'
          : 'Launch any tailored agro-industrial unit directly from the admin interface without developer dependencies.',
        steps: [
          {
            num: '০১',
            title: bn ? 'কাস্টম উইজার্ড ওপেন করুন' : 'Launch Provisioning Wizard in Console',
            desc: bn
              ? 'সাইডবারের "+ নতুন ব্যবসা যোগ করুন" বাটনে ক্লিক করে ব্যবসার নাম (যেমন: মেঘনা ফিড মিল বা রূপালী এগ্রো শপ) ও ধরন নির্বাচন করুন।'
              : 'Click "+ Add New Business" in the console sidebar and specify the enterprise name (e.g., Meghna Feed Mill) and category.',
          },
          {
            num: '০২',
            title: bn ? 'কাস্টম ইনভেন্টরি ও মেজারমেন্ট ইউনিট' : 'Define Inventory Units & Tracking Schema',
            desc: bn
              ? 'আপনার ব্যবসার প্রয়োজন অনুযায়ী পরিমাপের একক (কেজি, লিটার, ৫০ কেজি বস্তা, টন বা কার্টন) এবং কাস্টম ট্র্যাকিং ফিল্ড নির্বাচন করুন।'
              : 'Configure your primary units of measure (KG, 50kg Bags, Tons, Cartons) and define business-specific tracking fields.',
          },
          {
            num: '০৩',
            title: bn ? 'স্বয়ংক্রিয় চার্ট অব অ্যাকাউন্টস জেনারেশন' : 'Instant Auto-Generated Chart of Accounts',
            desc: bn
              ? 'সিস্টেম স্বয়ংক্রিয়ভাবে নতুন ব্যবসার জন্য পৃথক সম্পদ, দায়, বিক্রয় রাজস্ব ও পরিচালনা ব্যয়ের লেজার তৈরি করে কেন্দ্রীয় ট্রেজারিতে সংযুক্ত করে।'
              : 'The system automatically provisions isolated sub-ledgers for assets, liabilities, sales revenues, and expenses mapped to the treasury.',
          },
          {
            num: '০৪',
            title: bn ? 'ম্যানেজার রোল ও পারমিশন নির্ধারণ' : 'Assign Managers & Grant Scoped Permissions',
            desc: bn
              ? 'নতুন ইউনিটের জন্য শাখা ম্যানেজার বা ইনভেন্টরি অপারেটর নিয়োগ দিন। তারা কেবল তাদের নির্দিষ্ট ইউনিটের ডাটা দেখতে ও এন্ট্রি করতে পারবেন।'
              : 'Assign designated unit managers with role-based access restricted solely to this business unit without exposing headquarters data.',
          },
        ],
      },
      profit: {
        heading: bn ? 'কীভাবে লাভ হয় ও ব্যবসা সম্প্রসারণ করবেন' : 'How Custom Units Accelerate Conglomerate Profit',
        desc: bn
          ? 'নতুন ব্যবসায়িক সুযোগে তাৎক্ষণিক পদার্পণ, সেন্ট্রাল কনসোলিডেশন এবং সফটওয়্যার উন্নয়ন খরচ শূন্য রাখাই প্রধান চালিকাশক্তি।'
          : 'Capitalize rapidly on emergent market opportunities, unify cross-business purchasing power, and eliminate software dev expenses.',
        points: [
          {
            title: bn ? 'বাজারের নতুন সুযোগে তাৎক্ষণিক প্রবেশ' : 'Instant Time-to-Market for New Opportunities',
            desc: bn
              ? 'বাজারে কোনো নতুন লাভজনক এগ্রো বা রিটেইল সুযোগ তৈরি হলে সফটওয়্যারের অপেক্ষায় না থেকে ওই দিনেই পূর্ণ ডিজিটাল কার্যক্রম শুরু করা যায়।'
              : 'Capture sudden agricultural supply chain openings (e.g., grain shortage arbitrage) without waiting months for custom software development.',
            metric: 'তাত্ক্ষণিক শুরু',
          },
          {
            title: bn ? 'সেন্ট্রাল ক্যাশ ও ব্যাংক কনসোলিডেশন' : 'Central Treasury Liquidity Consolidation',
            desc: bn
              ? 'সবগুলো আলাদা ব্যবসার ক্যাশ এবং ব্যাংক ব্যালেন্স একটি সেন্ট্রাল স্ক্রিনে একত্রিত দেখা যায়, ফলে মূলধনের সঠিক বণ্টন ও নিরাপত্তা নিশ্চিত হয়।'
              : 'Executive visibility of all cash registers, bKash merchant wallets, and corporate bank accounts from one single dashboard.',
            metric: '১০০% কনসোলিডেশন',
          },
          {
            title: bn ? 'লস-মেকিং ইউনিট দ্রুত শনাক্তকরণ' : 'Rapid Loss-Making Unit Detection & Intervention',
            desc: bn
              ? 'প্রতিটি কাস্টম ইউনিটের পৃথক P&L থাকার কারণে কোন ব্যবসা লাভ করছে আর কোথায় অপচয় হচ্ছে তা মুহূর্তের মধ্যে ধরা পড়ে।'
              : 'Independent profit-and-loss auditing pinpoints underperforming units immediately, enabling corrective operational adjustments.',
            metric: 'স্পষ্ট P&L',
          },
          {
            title: bn ? 'শূন্য সফটওয়্যার ডেভেলপমেন্ট খরচ' : 'Zero Custom Software Development Overhead',
            desc: bn
              ? 'নতুন ব্যবসার জন্য আলাদা সফটওয়্যার কেনা বা প্রোগ্রামারদের পেছনে লাখ লাখ টাকা খরচ করার ঝামেলা চিরতরে বন্ধ হয়।'
              : 'Eliminates repetitive IT procurement, server deployments, and developer fees across unlimited new agricultural ventures.',
            metric: '১০০% সাশ্রয়',
          },
        ],
      },
      revenue: {
        heading: bn ? 'কী কী কাস্টম ব্যবসা ও আয়ের সুযোগ' : 'Custom Enterprise Verticals & Revenue Models',
        desc: bn
          ? 'ফিড মিল, রাইস ট্রেডিং, কোল্ড স্টোরেজ বা ব্র্যান্ডেড এগ্রো রিটেইল আউটলেট খুলে শত কোটি টাকার নতুন ব্যবসার দ্বার উন্মোচিত হয়।'
          : 'Scale into commercial feed manufacturing, seasonal grain trading, cold chain leasing, or branded retail agro superstores.',
        streams: [
          {
            name: bn ? 'বাণিজ্যিক ফিড মিল ও কুঁড়া প্রসেসিং' : 'Commercial Feed Mill & Rice Bran Processing',
            rate: bn ? 'উচ্চ পাইকারি চাহিদা' : 'High wholesale volume',
            cycle: bn ? 'দৈনিক উৎপাদন ও বিপণন' : 'Daily continuous milling',
            net: bn ? 'নিজস্ব খামারের ফিড বানিয়ে খরচ কমানো এবং স্থানীয় বাজারে ফিড বিক্রি করে ব্যাপক মুনাফা' : 'Slash captive farm feeding expenses while selling high-grade bagged feed to local farms',
          },
          {
            name: bn ? 'ব্র্যান্ডেড এগ্রো ও ডেইরি রিটেইল শপ' : 'Branded Fresh Farm-to-Table Retail Stores',
            rate: bn ? 'সরাসরি খুচরা প্রিমিয়াম মূল্য' : 'Retail consumer margins',
            cycle: bn ? 'দৈনিক নগদ ক্যাশ বিক্রয়' : 'Daily over-the-counter cash',
            net: bn ? 'খামারের খাঁটি দুধ, ডিম, মাছ ও মাংস সরাসরি গ্রাহকের কাছে বিক্রি করে দ্বিগুণ মুনাফা অর্জন' : 'Capture consumer markups by bypassing intermediaries with direct retail outlets',
          },
          {
            name: bn ? 'মৌসুমি শস্য ও রাইস ট্রেডিং ইউনিট' : 'Seasonal Grain, Maize & Rice Trading',
            rate: bn ? 'সিজনাল প্রাইস আর্বিট্রেজ' : 'Seasonal commodity arbitrage',
            cycle: bn ? 'ফসল কাটার মৌসুমে ক্রয় ও সঞ্চয়' : 'Harvest procurement cycles',
            net: bn ? 'সিজনে কম দামে ভুট্টা ও ধান কিনে অফ-সিজনে সর্বোচ্চ দামে বিক্রি করে কোটি টাকার টার্নওভার' : 'Procure bulk grain during harvest dips and sell during off-season peaks for massive ROI',
          },
          {
            name: bn ? 'সার, বালাইনাশক ও বীজ ডিস্ট্রিবিউশন' : 'Fertilizer, Seed & Agro Chemical Agency',
            rate: bn ? 'অনুমোদিত ডিলারশিপ কমিশন' : 'Authorized dealership margins',
            cycle: bn ? 'মৌসুমি চাষের সাইকেল' : 'Planting season surges',
            net: bn ? 'এলাকার কৃষকদের কাছে অনুমোদিত ইনপুট বিক্রি করে নিয়মিত নিশ্চিত নগদ কমিশন ও মুনাফা' : 'Reliable cash commission streams supplying certified inputs to surrounding farmers',
          },
        ],
        summary: bn
          ? 'সারসংক্ষেপ: কৃষিভূমি ইআরপি শুধুমাত্র ৫টি ব্যবসার মধ্যেই সীমাবদ্ধ নয়; এটি একটি মুক্ত বহুমুখী কনগ্লোমারেট অপারেটিং সিস্টেম। একজন উদ্যোক্তা তার যেকোনো নতুন ব্যবসা বা শাখা নিমিষেই যোগ করে কেন্দ্রীয়ভাবে হাজার কোটি টাকার সাম্রাজ্য পরিচালনা করতে পারেন।'
          : 'Summary: KrishiVumi Enterprise is not confined to preset categories—it is a limitless agro-industrial operating system empowering conglomerates to provision, govern, and scale unlimited ventures from a single audited control room.',
      },
      erp: {
        title: bn ? 'কৃষিভূমি ইআরপি কীভাবে কাস্টম ব্যবসা সহজ করে' : 'How KrishiVumi ERP Powers Custom Units',
        points: [
          bn ? '১-ক্লিকে নতুন ব্যবসার ডাটাবেজ প্রোভিশনিং ও কাস্টম মেজারমেন্ট ইউনিট কনফিগারেশন।' : 'One-click schema generation with customizable units of measure and inventory items.',
          bn ? 'স্বয়ংক্রিয় চার্ট অব অ্যাকাউন্টস ও কেন্দ্রীয় ডাবল-এন্ট্রি ট্রেজারির সাথে সমন্বিত সংযোগ।' : 'Instant double-entry chart of accounts linked seamlessly to the headquarters treasury.',
          bn ? 'আইসোলেটেড ব্রাঞ্চ রোল—ম্যানেজার কেবল তার শাখার হিসাব পরিচালনা করবেন, বাকি সব ডাটা সুরক্ষিত।' : 'Isolated branch RBAC permissions safeguarding organizational confidentiality.',
        ],
      },
    },
  ];

  const previewTabs: { id: PreviewTabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'overview', label: bn ? 'এক্সিকিউটিভ ওভারভিউ' : 'Executive Overview', icon: BarChart3 },
    { id: 'poultry', label: bn ? 'পোল্ট্রি ব্যাচ কন্ট্রোল' : 'Poultry Batches', icon: Bird },
    { id: 'livestock', label: bn ? 'ডেইরি ও ক্যাটল' : 'Livestock & Dairy', icon: Beef },
    { id: 'ledger', label: bn ? 'ডাবল-এন্ট্রি খতিয়ান' : 'Double-Entry Ledger', icon: FileSpreadsheet },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-emerald-600 selection:text-white">
      {/* Sticky Glassmorphic Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-950/85 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 h-16 flex items-center justify-between gap-4">
          <a href="#top" className="shrink-0">
            <BrandLogo subtitle={bn ? 'এগ্রো-ইন্ডাস্ট্রিয়াল ইআরপি' : 'AGRO-INDUSTRIAL ERP'} />
          </a>

          <nav className="hidden lg:flex items-center gap-7 text-[13px] font-semibold text-slate-600 dark:text-slate-300">
            <a href="#verticals" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap">
              {bn ? 'ব্যবসায়িক মডিউল' : 'Verticals'}
            </a>
            <a href="#preview" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap">
              {bn ? 'লাইভ প্রিভিউ' : 'Live Preview'}
            </a>
            <a href="#architecture" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap">
              {bn ? 'আর্কিটেকচার' : 'Architecture'}
            </a>
            <a href="#security" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap">
              {bn ? 'সিকিউরিটি' : 'Security'}
            </a>
            <a href="#contact" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors whitespace-nowrap">
              {bn ? 'যোগাযোগ' : 'Contact'}
            </a>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleLangToggle}
              className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Switch Language"
            >
              <Globe className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>{bn ? 'বাংলা' : 'EN'}</span>
            </button>

            <button
              type="button"
              onClick={handleThemeToggle}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Toggle Dark Mode"
            >
              {isDark ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4" />}
            </button>

            <button
              type="button"
              onClick={onAccessErpConsole}
              disabled={isSigningIn}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 active:scale-[0.99] transition-all shadow-sm shadow-emerald-600/25 whitespace-nowrap disabled:opacity-60"
            >
              <span>
                {isSigningIn
                  ? bn
                    ? 'সংযোগ হচ্ছে...'
                    : 'Connecting...'
                  : bn
                  ? 'ইআরপি কনসোল খুলুন'
                  : 'Access ERP Console'}
              </span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-5 py-4 space-y-3">
            <div className="flex flex-col space-y-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <a href="#verticals" onClick={() => setMobileMenuOpen(false)} className="py-1">
                {bn ? 'ব্যবসায়িক মডিউল' : 'Verticals'}
              </a>
              <a href="#preview" onClick={() => setMobileMenuOpen(false)} className="py-1">
                {bn ? 'লাইভ প্রিভিউ' : 'Live Preview'}
              </a>
              <a href="#architecture" onClick={() => setMobileMenuOpen(false)} className="py-1">
                {bn ? 'আর্কিটেকচার' : 'Architecture'}
              </a>
              <a href="#security" onClick={() => setMobileMenuOpen(false)} className="py-1">
                {bn ? 'সিকিউরিটি' : 'Security'}
              </a>
              <a href="#contact" onClick={() => setMobileMenuOpen(false)} className="py-1">
                {bn ? 'যোগাযোগ' : 'Contact'}
              </a>
            </div>
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <button
                type="button"
                onClick={handleLangToggle}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-semibold"
              >
                <Globe className="h-3.5 w-3.5 text-emerald-600" />
                <span>{bn ? 'Switch to English' : 'বাংলায় দেখুন'}</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Editorial Hero Section */}
      <section id="top" className="relative overflow-hidden bg-white dark:bg-slate-950">
        {/* Subtle Architectural Background */}
        <div className="absolute inset-0 bg-grid-slate pointer-events-none" />
        <div className="absolute -top-32 right-0 h-[480px] w-[480px] rounded-full bg-emerald-500/10 dark:bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 h-[360px] w-[360px] rounded-full bg-teal-500/10 dark:bg-teal-500/5 blur-3xl pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 pt-12 pb-16 lg:pt-20 lg:pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
            {/* Hero Copy */}
            <div className="lg:col-span-6 space-y-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800/70 bg-emerald-50/80 dark:bg-emerald-950/50 px-3.5 py-1.5 text-[11px] font-bold tracking-wide text-emerald-800 dark:text-emerald-300">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600 dark:bg-emerald-400" />
                </span>
                <span>
                  {bn
                    ? 'মাল্টি-বিজনেস এগ্রো কনগ্লোমারেট অপারেটিং সিস্টেম'
                    : 'ENTERPRISE AGRO-INDUSTRIAL OPERATING SYSTEM'}
                </span>
              </div>

              <h1
                className="text-3xl sm:text-5xl lg:text-[3.25rem] font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.1]"
                style={{ textWrap: 'balance' }}
              >
                {bn ? (
                  <>
                    সমন্বিত কৃষি ব্যবসা ও{' '}
                    <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                      ডাবল-এন্ট্রি ট্রেজারি
                    </span>{' '}
                    ইআরপি সিস্টেম
                  </>
                ) : (
                  <>
                    Dynamic Multi-Business Agro ERP &{' '}
                    <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                      Double-Entry Treasury
                    </span>
                  </>
                )}
              </h1>

              <p className="text-base sm:text-[17px] text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
                {bn
                  ? 'পোল্ট্রি, ডেইরি ও বিফ ক্যাটল, ছাগল, মৎস্য চাষ, বাণিজ্যিক ট্রাক পরিবহন এবং কাস্টম এগ্রো-ইন্ডাস্ট্রিয়াল ব্যবসা পরিচালনা করুন একটি কেন্দ্রীয়, জিরো-ট্রাস্ট এন্টারপ্রাইজ প্ল্যাটফর্ম থেকে।'
                  : 'Command Poultry, Dairy & Beef Cattle, Goat Breeding, Polyculture Fisheries, Commercial Fleet Logistics, and unlimited custom agro units from one unified, zero-trust enterprise platform.'}
              </p>

              <div className="flex flex-wrap items-center gap-3.5 pt-1">
                <button
                  type="button"
                  onClick={onAccessErpConsole}
                  disabled={isSigningIn}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 text-sm font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 active:scale-[0.99] whitespace-nowrap disabled:opacity-60"
                >
                  <span>
                    {isSigningIn
                      ? bn
                        ? 'অথেনটিকেশন হচ্ছে...'
                        : 'Authenticating...'
                      : bn
                      ? 'লাইভ ইআরপি ওয়ার্কস্পেস চালু করুন'
                      : 'Launch Live ERP Workspace'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="#preview"
                  className="inline-flex items-center gap-2 px-5 py-3.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors shadow-xs whitespace-nowrap"
                >
                  <span>{bn ? 'কনসোল প্রিভিউ দেখুন' : 'Explore Console Preview'}</span>
                </a>
              </div>

              {/* Trust Strip */}
              <div className="pt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  {bn ? 'অডিট-রেডি ডাবল-এন্ট্রি লেজার' : 'Audit-Ready Double Entry'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  {bn ? '৩-স্তরের আরবিএসি নিরাপত্তা' : '3-Tier RBAC Enforcement'}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  {bn ? 'বাংলা ও ইংরেজি নেটিভ (BDT ৳)' : 'BDT (৳) & Bilingual Native'}
                </span>
              </div>
            </div>

            {/* Hero Visual Showcase Frame */}
            <div className="lg:col-span-6">
              <div className="relative">
                {/* Outer Framed Container */}
                <div className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-2xl shadow-slate-900/10 dark:shadow-black/50">
                  <div className="relative h-[340px] sm:h-[400px] rounded-xl overflow-hidden bg-slate-900">
                    {!heroImgFailed ? (
                      <img
                        src="/images/agro_enterprise_hero.jpg"
                        alt="Aerial view of modern integrated agro-industrial complex in Bangladesh with fish ponds, poultry and cattle barns, and logistics fleet"
                        referrerPolicy="no-referrer"
                        onError={() => setHeroImgFailed(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-slate-900 text-slate-200">
                        <Landmark className="h-12 w-12 text-emerald-500 mb-3" />
                        <p className="text-sm font-semibold">
                          KrishiVumi Integrated Agro Complex — Gazipur, Savar, Kushtia & Mymensingh
                        </p>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/15 to-transparent" />

                    {/* Subtle Top-Right Live Telemetry Pill */}
                    <div className="absolute top-4 right-4 rounded-xl bg-slate-950/75 backdrop-blur-md border border-white/15 px-3.5 py-2 text-white shadow-lg">
                      <div className="flex items-center gap-2 text-[11px] font-semibold text-emerald-300">
                        <Activity className="h-3.5 w-3.5" />
                        <span>{bn ? 'রিয়েল-টাইম সিঙ্ক সক্রিয়' : 'Live Telemetry Active'}</span>
                      </div>
                      <div className="mt-0.5 text-[11px] font-mono text-slate-300">
                        Gazipur · Savar · Kushtia · Trishal
                      </div>
                    </div>

                    {/* Clean Bottom Caption Bar */}
                    <div className="absolute bottom-4 left-4 right-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                      <div className="rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/10 px-4 py-3 text-white max-w-sm">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                          {bn ? 'একীভূত অপারেশনস' : 'Unified Operations'}
                        </div>
                        <div className="text-xs font-medium text-slate-100 mt-0.5 leading-snug">
                          {bn
                            ? 'বায়োলজিক্যাল ব্যাচ, পশুর ট্যাগ, পুকুর ও কেন্দ্রীয় বিডিটি অ্যাকাউন্টিং একসাথে।'
                            : 'Biological batches, tagged livestock, pond cycles & double-entry BDT treasury.'}
                        </div>
                      </div>

                      <div className="rounded-xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200/80 dark:border-slate-700 px-4 py-2.5 shadow-xl shrink-0">
                        <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {bn ? 'ব্যালেন্স স্ট্যাটাস' : 'Ledger Integrity'}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5 text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                          <TrendingUp className="h-4 w-4" />
                          <span>100% Balanced</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4-Column Quantitative Executive Proof Bar */}
          <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                val: '5 + Unlimited',
                label: bn
                  ? 'মূল খামার ভার্টিক্যাল ও ডাইনামিক বিজনেস উইজার্ড'
                  : 'Core Agro Verticals + Zero-Code Expansion Wizard',
                Icon: Building2,
              },
              {
                val: '100% Balanced',
                label: bn
                  ? 'ডাবল-এন্ট্রি লেজার, রিভার্সাল ও কন্ট্রা ট্রান্সফার'
                  : 'Double-Entry Ledger with Reversal Counter-Entries',
                Icon: Landmark,
              },
              {
                val: '3-Tier RBAC',
                label: bn
                  ? 'সুপার অ্যাডমিন, ম্যানেজার ও কর্মচারী পারমিশন কন্ট্রোল'
                  : 'Super Admin, Manager & Staff Backend Rule Enforcement',
                Icon: Lock,
              },
              {
                val: 'BDT (৳) Native',
                label: bn
                  ? 'বাংলাদেশি অপারেশন (বাংলা ও ইংরেজি) ও মাল্টি-কারেন্সি রেডি'
                  : 'Built for Bangladesh Operations (EN & বাংলা) & Global Ready',
                Icon: Coins,
              },
            ].map((stat) => (
              <div
                key={stat.val}
                className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 p-5 flex items-start gap-3.5 hover:border-emerald-500/40 transition-colors"
              >
                <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <stat.Icon className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-lg font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                    {stat.val}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                    {stat.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Console Preview Section */}
      <section
        id="preview"
        className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 py-16 lg:py-24"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-2xl space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                {bn ? 'ইন্টারেক্টিভ প্রিভিউ' : 'INSIDE THE CONSOLE'}
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {bn
                  ? 'মালিক ও ম্যানেজারদের জন্য নির্মিত আধুনিক কমান্ড সেন্টার'
                  : 'An Executive Command Center Built for Speed & Clarity'}
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {bn
                  ? 'লগইন করার আগেই নিচের ট্যাবগুলোতে ক্লিক করে দেখুন প্রতিটি ব্যবসায়িক মডিউল কীভাবে একসাথে কাজ করে।'
                  : 'Inspect how consolidated treasury metrics, farm batch telemetry, and immutable journal entries come together inside one unified workspace.'}
              </p>
            </div>

            {/* Preview Switcher Pills */}
            <div className="flex flex-wrap gap-1.5 p-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
              {previewTabs.map((tab) => {
                const active = activePreviewTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActivePreviewTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                      active
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Browser Window Mockup */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl shadow-slate-900/5 dark:shadow-black/40 overflow-hidden">
            {/* Mockup Chrome Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-slate-950/70">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="px-3 py-1 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-500 dark:text-slate-400">
                console.krishivumi.bd / {activePreviewTab}
              </div>
              <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                ● Live Cloud Sync
              </div>
            </div>

            {/* Mockup Body */}
            <div className="p-6 lg:p-8">
              {activePreviewTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { k: bn ? 'সর্বমোট বিক্রি' : 'Consolidated Revenue', v: '৳ 48,65,000', tag: '+18.4%', c: 'text-emerald-600' },
                      { k: bn ? 'সর্বমোট ব্যয়' : 'Operating Expenses', v: '৳ 31,20,400', tag: 'Controlled', c: 'text-slate-600 dark:text-slate-400' },
                      { k: bn ? 'নিট মুনাফা' : 'Consolidated Net Profit', v: '৳ 17,44,600', tag: '35.8% Margin', c: 'text-emerald-600' },
                      { k: bn ? 'ক্যাশ ও ব্যাংক তহবিল' : 'Cash & Bank Treasury', v: '৳ 22,90,500', tag: 'Liquid', c: 'text-sky-600' },
                    ].map((card) => (
                      <div
                        key={card.k}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 p-4"
                      >
                        <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{card.k}</div>
                        <div className="mt-2 text-xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                          {card.v}
                        </div>
                        <div className={`mt-1 text-[11px] font-bold ${card.c}`}>{card.tag}</div>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {[
                      { name: 'KrishiVumi Poultry (Gazipur)', rev: '৳ 18,40,000', profit: '৳ 6,25,000', pct: '82%' },
                      { name: 'Savar Dairy & Cattle Farm', rev: '৳ 15,80,000', profit: '৳ 5,45,000', pct: '74%' },
                      { name: 'Trishal Aquaculture Ponds', rev: '৳ 14,45,000', profit: '৳ 5,74,600', pct: '79%' },
                    ].map((unit) => (
                      <div
                        key={unit.name}
                        className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 dark:text-white">{unit.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                            Active
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-500">Sales: {unit.rev}</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">Net: {unit.profit}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-600" style={{ width: unit.pct }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activePreviewTab === 'poultry' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { code: 'POL-2026-001', shed: 'Shed-01 · Broiler', live: '994 / 1,000', fcr: '1.54 FCR', net: '৳ 1,26,000' },
                    { code: 'POL-2026-002', shed: 'Shed-02 · Sonali', live: '1,480 / 1,500', fcr: '1.78 FCR', net: '৳ 1,94,500' },
                    { code: 'POL-2026-003', shed: 'Shed-04 · Layer', live: '2,390 / 2,400', fcr: '92% Laying', net: '৳ 3,42,000' },
                  ].map((b) => (
                    <div key={b.code} className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3 bg-slate-50/50 dark:bg-slate-950/50">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">{b.code}</span>
                        <span className="text-[11px] font-semibold text-slate-500">{b.fcr}</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{b.shed}</div>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-xs font-mono">
                        <span className="text-slate-500">Alive: {b.live}</span>
                        <span className="font-bold text-emerald-600">Profit: {b.net}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activePreviewTab === 'livestock' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { tag: 'CAT-0001 · Rani', breed: 'Holstein Friesian Cross', metric: '24 L/Day Milk', status: 'Healthy · FMD Vaccinated' },
                    { tag: 'CAT-0014 · Sultan', breed: 'Sahiwal Beef Fattening', metric: '485 KG Live Wt', status: 'Qurbani Grade A' },
                    { tag: 'GOAT-0008 · Black Pearl', breed: 'Black Bengal Lineage', metric: '3 Kids Recorded', status: 'PPR Protected' },
                  ].map((a) => (
                    <div key={a.tag} className="rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-2.5 bg-slate-50/50 dark:bg-slate-950/50">
                      <div className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">{a.tag}</div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">{a.breed}</div>
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{a.metric}</div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">{a.status}</div>
                    </div>
                  ))}
                </div>
              )}

              {activePreviewTab === 'ledger' && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                        <th className="pb-3 font-semibold">Voucher</th>
                        <th className="pb-3 font-semibold">Business Unit</th>
                        <th className="pb-3 font-semibold">Debit Account</th>
                        <th className="pb-3 font-semibold">Credit Account</th>
                        <th className="pb-3 font-semibold text-right">Amount (BDT)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                      {[
                        { ref: 'JV-10428', biz: 'Poultry Unit', dr: 'Islami Bank A/C', cr: 'Broiler Sales Revenue', amt: '৳ 3,50,000' },
                        { ref: 'JV-10429', biz: 'Cattle Dairy', dr: 'Milk & Feed Expense', cr: 'Main Farm Cash', amt: '৳ 42,500' },
                        { ref: 'JV-10430', biz: 'Treasury Contra', dr: 'BRAC Bank Corporate', cr: 'Office Cash Vault', amt: '৳ 2,00,000' },
                      ].map((row) => (
                        <tr key={row.ref}>
                          <td className="py-3 font-bold text-emerald-600 dark:text-emerald-400">{row.ref}</td>
                          <td className="py-3 font-sans font-medium text-slate-900 dark:text-slate-100">{row.biz}</td>
                          <td className="py-3 text-slate-600 dark:text-slate-300">{row.dr}</td>
                          <td className="py-3 text-slate-600 dark:text-slate-300">{row.cr}</td>
                          <td className="py-3 text-right font-bold text-slate-900 dark:text-white">{row.amt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Core Business Verticals Section */}
      <section id="verticals" className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-16 lg:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 space-y-12">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-3xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400 shrink-0" />
                <span>{bn ? '৫টি মূল খামার ও ব্যবসা নির্দেশিকা' : '5 Core Business Roadmaps'}</span>
              </div>
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {bn ? (
                  <>
                    কীভাবে শুরু করবেন,{' '}
                    <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                      কীভাবে লাভ হয়
                    </span>{' '}
                    ও কী কী লাভ হয়
                  </>
                ) : (
                  <>
                    How to Start,{' '}
                    <span className="bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
                      How Profits are Generated
                    </span>{' '}
                    & Complete Return Breakdown
                  </>
                )}
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {bn
                  ? 'পোল্ট্রি, ডেইরি গরু, ছাগল পালন, মৎস্য চাষ ও বাণিজ্যিক ট্রাক—প্রতিটি ব্যবসার বাস্তবসম্মত সেটআপ গাইড, খাদ্য ও খরচ নিয়ন্ত্রণের বৈজ্ঞানিক কৌশল এবং চূড়ান্ত নিট মুনাফার স্পষ্ট হিসাব।'
                  : 'Actionable startup roadmaps, feed conversion controls, biosecurity protocols, and verified financial ROI across Poultry, Dairy & Beef, Goat Breeding, Aquaculture, and Logistics.'}
              </p>
            </div>

            <button
              type="button"
              onClick={onAccessErpConsole}
              disabled={isSigningIn}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-600/20 active:scale-[0.99] whitespace-nowrap self-start md:self-auto shrink-0"
            >
              <span>{bn ? 'লাইভ ইআরপিতে মডিউলগুলো দেখুন' : 'Explore Modules in Live ERP'}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Interactive Business Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {verticals.map((v) => {
              const active = activeVerticalId === v.id;
              const VIcon = v.Icon;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setActiveVerticalId(v.id);
                  }}
                  className={`inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 border ${
                    active
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div
                    className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${
                      active ? 'bg-white/20 dark:bg-slate-900/20' : v.accent
                    }`}
                  >
                    <VIcon className="h-3.5 w-3.5" />
                  </div>
                  <span>{v.shortTitle}</span>
                </button>
              );
            })}
          </div>

          {/* Active Business Deep-Dive Showcase Card */}
          {(() => {
            const current = verticals.find((v) => v.id === activeVerticalId) || verticals[0];
            const CurIcon = current.Icon;
            return (
              <div className="rounded-3xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-xl shadow-slate-900/5 dark:shadow-black/40 overflow-hidden">
                {/* Spotlight Header */}
                <div className="p-6 sm:p-8 lg:p-10 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-br from-slate-50 via-white to-slate-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div className="space-y-3 max-w-2xl">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <div className={`h-11 w-11 rounded-2xl flex items-center justify-center ring-1 ring-inset ${current.accent}`}>
                          <CurIcon className="h-6 w-6" />
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${current.badgeBg}`}>
                          {current.meta}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {current.subtitle}
                        </span>
                      </div>

                      <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        {current.title}
                      </h3>

                      <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        {current.tagline}
                      </p>
                    </div>

                    {/* 4 Quantitative Metrics Quick Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4 gap-3 shrink-0">
                      {current.metrics.map((m) => (
                        <div
                          key={m.label}
                          className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-3.5 space-y-1 shadow-2xs"
                        >
                          <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            {m.label}
                          </div>
                          <div className="text-base sm:text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                            {m.value}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1">
                            {m.hint}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 4 Deep-Dive Sub-Tabs */}
                  <div className="mt-8 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-200 dark:border-slate-800">
                    {[
                      { id: 'startup' as DeepDiveTabId, label: bn ? '১. কীভাবে শুরু করবেন (গাইড ও সেটআপ)' : '1. How to Start (Roadmap & Setup)', icon: Compass },
                      { id: 'profit' as DeepDiveTabId, label: bn ? '২. কীভাবে লাভ হয় (ব্যয় নিয়ন্ত্রণ ও গোপন সূত্র)' : '2. How Profit is Made (Cost Control)', icon: Zap },
                      { id: 'revenue' as DeepDiveTabId, label: bn ? '৩. কী কী লাভ ও পণ্য (আয়ের সম্পূর্ণ হিসাব)' : '3. Products & Net Revenue Streams', icon: Coins },
                      { id: 'erp' as DeepDiveTabId, label: bn ? '৪. কৃষিভূমি ইআরপি কীভাবে সহযোগিতা করে' : '4. KrishiVumi ERP Capabilities', icon: ShieldCheck },
                    ].map((t) => {
                      const active = activeDeepDiveTab === t.id;
                      const TabIcon = t.icon;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setActiveDeepDiveTab(t.id)}
                          className={`inline-flex items-center gap-2 px-4 py-2.5 border-b-2 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                            active
                              ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-t-lg'
                              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                          }`}
                        >
                          <TabIcon className="h-3.5 w-3.5" />
                          <span>{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-Tab Content Body */}
                <div className="p-6 sm:p-8 lg:p-10">
                  {/* TAB 1: How to Start */}
                  {activeDeepDiveTab === 'startup' && (
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Compass className="h-5 w-5 text-emerald-600" />
                          <span>{current.startup.heading}</span>
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                          {current.startup.desc}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {current.startup.steps.map((st) => (
                          <div
                            key={st.num}
                            className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-5 space-y-2.5 relative overflow-hidden"
                          >
                            <div className="flex items-center justify-between">
                              <span className="inline-flex items-center justify-center h-7 w-7 rounded-lg bg-emerald-600 text-white font-mono text-xs font-extrabold shadow-sm">
                                {st.num}
                              </span>
                              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                                {bn ? 'ধাপ' : 'Step'} {st.num}
                              </span>
                            </div>
                            <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                              {st.title}
                            </h5>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                              {st.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 2: How Profit is Generated */}
                  {activeDeepDiveTab === 'profit' && (
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Zap className="h-5 w-5 text-amber-500" />
                          <span>{current.profit.heading}</span>
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                          {current.profit.desc}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {current.profit.points.map((pt, idx) => (
                          <div
                            key={pt.title}
                            className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-5 space-y-3"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                  {bn ? 'কৌশল' : 'Lever'} #{idx + 1}
                                </span>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-[11px] font-extrabold">
                                {pt.metric}
                              </span>
                            </div>
                            <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                              {pt.title}
                            </h5>
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                              {pt.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: What Products & Profits */}
                  {activeDeepDiveTab === 'revenue' && (
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <Coins className="h-5 w-5 text-emerald-600" />
                          <span>{current.revenue.heading}</span>
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                          {current.revenue.desc}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {current.revenue.streams.map((rs) => (
                          <div
                            key={rs.name}
                            className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-5 space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white">
                                {rs.name}
                              </span>
                              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                                {rs.rate}
                              </span>
                            </div>
                            <div className="text-[11px] font-mono text-slate-500">
                              {bn ? 'টার্নওভার সাইকেল:' : 'Cycle:'} {rs.cycle}
                            </div>
                            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {rs.net}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Summary ROI Box */}
                      <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800/80 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-transparent p-5 sm:p-6 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          <BadgePercent className="h-4 w-4" />
                          <span>{bn ? 'আর্থিক সারসংক্ষেপ ও বাৎসরিক ক্যাশ রিটার্ন' : 'Financial Summary & Annualized Cash ROI'}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                          {current.revenue.summary}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* TAB 4: KrishiVumi ERP Features */}
                  {activeDeepDiveTab === 'erp' && (
                    <div className="space-y-6">
                      <div className="space-y-1">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <ShieldCheck className="h-5 w-5 text-emerald-600" />
                          <span>{current.erp.title}</span>
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                          {bn
                            ? 'খামারের খাতার জটিল হিসাব, অপচয় এবং কর্মচারীদের হিসাবের গড়মিল চিরতরে বন্ধ করতে কৃষিভূমি ইআরপি ক্লাউড প্ল্যাটফর্ম।'
                            : 'KrishiVumi ERP replaces prone-to-error paper logs with automated biological telemetry, inventory stock alerts, and audited double-entry BDT accounts.'}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {current.erp.points.map((pt, idx) => (
                          <div
                            key={idx}
                            className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-5 space-y-3"
                          >
                            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-mono font-bold text-xs">
                              0{idx + 1}
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                              {pt}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {bn ? 'সুপার অ্যাডমিন, ম্যানেজার ও কর্মচারীদের পৃথক এক্সেস অনুমতিসহ।' : 'Equipped with isolated RBAC access controls for Owners, Managers, and Farm Staff.'}
                        </div>
                        <button
                          type="button"
                          onClick={onAccessErpConsole}
                          disabled={isSigningIn}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm shadow-emerald-600/20"
                        >
                          <span>{bn ? 'এই মডিউলের লাইভ কনসোল খুলুন' : 'Open Live ERP Console'}</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* All 5 Businesses Comprehensive Comparison Grid */}
          <div className="pt-6 space-y-6">
            <div className="max-w-2xl space-y-1">
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white">
                {bn ? 'সকল ৫টি খামার ও ব্যবসার বিস্তারিত তুলনামূলক গাইড' : 'Comprehensive Roadmaps for All 5 Verticals'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                {bn
                  ? 'নিচের প্রতিটি কার্ডে ক্লিক করে এক নজরে দেখে নিন কীভাবে প্রতিটি ব্যবসা শুরু করবেন, কীভাবে লাভ হয় এবং সম্ভাব্য নিট আয় কত।'
                  : 'Expand any vertical card below to review startup steps, operational secrets, and expected revenue off-takes at a glance.'}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {verticals.map((item) => {
                const isExpanded = !!expandedCards[item.id];
                const ItemIcon = item.Icon;
                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/80 p-6 flex flex-col justify-between space-y-5 hover:border-emerald-500/50 hover:shadow-lg transition-all"
                  >
                    <div className="space-y-4">
                      {/* Card Header */}
                      <div className="flex items-center justify-between gap-3">
                        <div className={`h-11 w-11 rounded-xl flex items-center justify-center ring-1 ring-inset ${item.accent}`}>
                          <ItemIcon className="h-5 w-5" />
                        </div>
                        <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 text-right">
                          {item.meta}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                          {item.desc}
                        </p>
                      </div>

                      {/* 3 Quick-Pillars Preview */}
                      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                          <Compass className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            <strong className="font-semibold text-slate-900 dark:text-white">
                              {bn ? 'শুরু:' : 'Start:'}
                            </strong>{' '}
                            {item.startup.steps[0].title}
                          </span>
                        </div>

                        <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                          <Zap className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                          <span>
                            <strong className="font-semibold text-slate-900 dark:text-white">
                              {bn ? 'লাভের সূত্র:' : 'Profit:'}
                            </strong>{' '}
                            {item.profit.points[0].title}
                          </span>
                        </div>

                        <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                          <Coins className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                          <span>
                            <strong className="font-semibold text-slate-900 dark:text-white">
                              {bn ? 'আয় ও লাভ:' : 'Revenue:'}
                            </strong>{' '}
                            {item.revenue.streams[0].name} ({item.revenue.streams[0].rate})
                          </span>
                        </div>
                      </div>

                      {/* Expanded Full Accordion */}
                      {isExpanded && (
                        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-4">
                          {/* Startup Roadmap */}
                          <div className="space-y-2">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                              {bn ? 'কীভাবে শুরু করবেন:' : 'Startup Roadmap:'}
                            </div>
                            <div className="space-y-2">
                              {item.startup.steps.map((st) => (
                                <div key={st.num} className="rounded-lg bg-slate-50 dark:bg-slate-950/70 p-2.5 text-[11px] space-y-0.5">
                                  <div className="font-bold text-slate-900 dark:text-white">
                                    {st.num}. {st.title}
                                  </div>
                                  <div className="text-slate-600 dark:text-slate-400">
                                    {st.desc}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Profit Levers */}
                          <div className="space-y-2">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                              {bn ? 'কীভাবে লাভ হয়:' : 'Profit Levers:'}
                            </div>
                            <div className="space-y-1.5">
                              {item.profit.points.map((pt) => (
                                <div key={pt.title} className="text-[11px] flex items-start gap-1.5 text-slate-700 dark:text-slate-300">
                                  <span className="text-emerald-500 font-bold shrink-0">✓</span>
                                  <span>
                                    <strong>{pt.title}:</strong> {pt.desc}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Revenue Streams */}
                          <div className="space-y-2">
                            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                              {bn ? 'কী কী লাভ ও পণ্য:' : 'Revenue Streams & Margin:'}
                            </div>
                            <div className="space-y-1.5">
                              {item.revenue.streams.map((rs) => (
                                <div key={rs.name} className="rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/40 p-2 text-[11px]">
                                  <div className="font-bold text-slate-900 dark:text-white flex justify-between">
                                    <span>{rs.name}</span>
                                    <span className="text-emerald-600 dark:text-emerald-400">{rs.rate}</span>
                                  </div>
                                  <div className="text-slate-600 dark:text-slate-400 mt-0.5">
                                    {rs.net}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCardExpanded(item.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                      >
                        <span>
                          {isExpanded
                            ? bn
                              ? 'সংক্ষিপ্ত করুন'
                              : 'Collapse Details'
                            : bn
                            ? 'বিস্তারিত গাইড দেখুন'
                            : 'Expand Roadmap'}
                        </span>
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setActiveVerticalId(item.id);
                          if (typeof document !== 'undefined') {
                            document.getElementById('verticals')?.scrollIntoView({ behavior: 'smooth' });
                          }
                        }}
                        className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                      >
                        {bn ? 'স্পটলাইটে দেখুন' : 'View in Spotlight'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Architecture & Security Section */}
      <section
        id="architecture"
        className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 py-16 lg:py-24"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-6 space-y-6">
            <div className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              {bn ? 'হিসাবের স্বচ্ছতা ও নিরাপত্তা' : 'ENTERPRISE GOVERNANCE'}
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {bn
                ? 'অপরিবর্তনীয় ডাবল-এন্ট্রি অ্যাকাউন্টিং ও জিরো-ট্রাস্ট সিকিউরিটি'
                : 'Enterprise Accounting Integrity & Layered Zero-Trust Security'}
            </h2>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed">
              {bn
                ? 'পোল্ট্রি, গরু, ছাগল, মাছ ও পরিবহন ব্যবসার প্রতিটি আর্থিক লেনদেন সরাসরি কেন্দ্রীয় ডাবল-এন্ট্রি লেজারে পোস্ট হয়। অনুমোদিত এন্ট্রি মুছে ফেলা যায় না—সংশোধনের জন্য ব্যালেন্সড রিভার্সাল এন্ট্রি ও পূর্ণাঙ্গ অডিট লগ সংরক্ষিত থাকে।'
                : 'Every financial event across Poultry, Cattle, Goat, Fish, Transport, and Custom units posts to an immutable double-entry ledger. Posted entries require balanced counter-entry reversals with complete actor audit logging.'}
            </p>

            <div id="security" className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Lock className="h-4 w-4" />
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {bn ? 'জিরো-ট্রাস্ট ডাটাবেজ রুলস' : 'Zero-Trust Security Rules'}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {bn
                    ? 'ফিল্ড অ্যালাউলিস্ট, সার্ভার টাইমস্ট্যাম্প এবং বিজনেস-ভিত্তিক ডাটা আইসোলেশন।'
                    : 'Strict field allowlists, server-timestamp verification, and owner/business data isolation.'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 space-y-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Landmark className="h-4 w-4" />
                </div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">
                  {bn ? 'নির্ভুল কন্ট্রা ট্রান্সফার' : 'Contra Transfer Isolation'}
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {bn
                    ? 'ক্যাশ থেকে ব্যাংক বা ব্যাংক থেকে ক্যাশ ট্রান্সফারে কৃত্রিম আয় বা ব্যয় তৈরি হয় না।'
                    : 'Cash-to-Bank transfers update treasury balances accurately without inflating P&L revenue.'}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 shadow-xl">
              <div className="relative rounded-xl overflow-hidden bg-slate-900 h-80 sm:h-96">
                {!livestockImgFailed ? (
                  <img
                    src="/images/agro_precision_livestock.jpg"
                    alt="Modern commercial dairy and livestock farm interior with automated feeding troughs"
                    referrerPolicy="no-referrer"
                    onError={() => setLivestockImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">
                    Precision Livestock & Feed Operations
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-xl bg-slate-950/80 backdrop-blur-md border border-white/10 px-4 py-3 text-white">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      {bn ? 'প্রিসিশন লাইভস্টক ও ফিড' : 'Precision Livestock & Feed'}
                    </div>
                    <div className="text-xs font-medium text-slate-200 mt-0.5">
                      {bn
                        ? 'প্রতিটি খামারের স্টক, ফিড এবং ভেটেরিনারি খরচ রিয়েল-টাইম লেজারে যুক্ত'
                        : 'Real-time feed inventory & veterinary cost attribution per animal & shed'}
                    </div>
                  </div>
                  <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Executive CTA Band */}
      <section className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-14">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 px-6 py-10 sm:px-12 sm:py-14 text-white shadow-2xl">
            <div className="absolute inset-0 bg-dots-subtle opacity-30 pointer-events-none" />
            <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-8">
              <div className="max-w-2xl space-y-3">
                <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  {bn
                    ? 'আপনার সবগুলো কৃষি ব্যবসা এক কেন্দ্রীয় সিস্টেমে নিয়ে আসুন'
                    : 'Ready to Unify Your Agro-Industrial Conglomerate?'}
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {bn
                    ? 'গুগল অ্যাকাউন্ট দিয়ে নিরাপদে সাইন-ইন করে এখনই লাইভ ড্যাশবোর্ড, খামার মডিউল ও ডাবল-এন্ট্রি অ্যাকাউন্টিং ব্যবহার শুরু করুন।'
                    : 'Sign in securely to access live business units, biological batch controls, fleet operations, and audited financial statements.'}
                </p>
              </div>
              <div className="shrink-0">
                <button
                  type="button"
                  onClick={onAccessErpConsole}
                  disabled={isSigningIn}
                  className="inline-flex items-center gap-2.5 px-7 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-extrabold transition-all shadow-lg shadow-emerald-500/25 whitespace-nowrap disabled:opacity-60"
                >
                  <span>
                    {isSigningIn
                      ? bn
                        ? 'সংযোগ হচ্ছে...'
                        : 'Connecting ERP...'
                      : bn
                      ? 'ইআরপি ড্যাশবোর্ডে প্রবেশ করুন'
                      : 'Enter Executive Console'}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Structured Enterprise Footer */}
      <footer
        id="contact"
        className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 py-12"
      >
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-5 space-y-3">
              <BrandLogo subtitle="AGRO-INDUSTRIAL ERP" />
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed">
                {bn
                  ? 'বাংলাদেশের বহুমুখী কৃষি, খামার ও পরিবহন শিল্পের জন্য নির্মিত এন্টারপ্রাইজ রিসোর্স প্ল্যানিং ও ডাবল-এন্ট্রি হিসাব সিস্টেম।'
                  : 'Enterprise Resource Planning and Double-Entry Treasury platform engineered for integrated agro, livestock, aquaculture, and fleet conglomerates.'}
              </p>
            </div>

            <div className="md:col-span-3 space-y-2.5 text-xs">
              <div className="font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                {bn ? 'মডিউলসমূহ' : 'Core Modules'}
              </div>
              <ul className="space-y-1.5 text-slate-600 dark:text-slate-400">
                <li>Poultry Batch Management</li>
                <li>Dairy Cattle & Goat Lineage</li>
                <li>Polyculture Pond Telemetry</li>
                <li>Fleet & Double-Entry Ledger</li>
              </ul>
            </div>

            <div className="md:col-span-4 space-y-2.5 text-xs">
              <div className="font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                {bn ? 'কর্পোরেট অফিস' : 'Corporate Headquarters'}
              </div>
              <div className="space-y-2 text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <MapPin className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                  <span>Gulshan-2 & Tejgaon Industrial Area, Dhaka, Bangladesh</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>+880 2-9884500</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <span>enterprise@krishivumi.bd</span>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
            <div>
              © {new Date().getFullYear()} KrishiVumi Agro Conglomerate Ltd. All rights reserved.
            </div>
            <div>
              Private ERP routes are protected from public search indexing.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
