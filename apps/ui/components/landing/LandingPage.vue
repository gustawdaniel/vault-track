<script setup>
import {
  ArrowPathIcon,
  CloudArrowUpIcon,
  FingerPrintIcon,
  LockClosedIcon,
} from '@heroicons/vue/24/outline';
import { CheckIcon } from '@heroicons/vue/20/solid';

import nuxtLogo from '~/assets/logo/nuxt-green-black.svg';
import tailwindLogo from '~/assets/logo/tailwindcss-logotype.svg';
import typescriptLogo from '~/assets/logo/typescript.svg';

const logos = [
  { name: 'Nuxt', image: nuxtLogo },
  { name: 'Tailwind', image: tailwindLogo },
  { name: 'Typescript', image: typescriptLogo },
];

const features = [
  {
    name: 'Privacy-Centric',
    description:
      "Your financial data stays completely private as it's stored locally in your browser - not on any external server.",
    icon: CloudArrowUpIcon,
  },
  {
    name: 'Multicurrency Support',
    description:
      'Seamlessly manage finances in multiple currencies, making it easy to track for digital nomads or travelers.',
    icon: LockClosedIcon,
  },
  {
    name: 'Categories & Projects',
    description:
      'Efficiently categorize your financial transactions, gain valuable insights into your spending habits and financial priorities.',
    icon: ArrowPathIcon,
  },
  {
    name: 'Open Source',
    description:
      'Our app is both free to use and open source, giving you full control and transparency over your financial management.',
    icon: FingerPrintIcon,
  },
];
const tiers = [
  {
    name: 'Single Device',
    id: 'single-device',
    to: '/setup',
    priceMonthly: '$0',
    description: 'Your data are stored in browser, we not sync them.',
    features: [
      'Unlimited accounts',
      'Unlimited projects & categories',
      'Unlimited incomes, expenses and transfers',
      'Export and import in formats: QIF, JSON',
      'No account needed',
      'Unlimited support of app creator',
    ],
    mostPopular: false,
  },
  // {
  //   name: 'Startup',
  //   id: 'tier-startup',
  //   href: '#',
  //   priceMonthly: '$32',
  //   description: 'A plan that scales with your rapidly growing business.',
  //   features: [
  //     '25 products',
  //     'Up to 10,000 subscribers',
  //     'Advanced analytics',
  //     '24-hour support response time',
  //     'Marketing automations',
  //   ],
  //   mostPopular: true,
  // },
  // {
  //   name: 'Enterprise',
  //   id: 'tier-enterprise',
  //   href: '#',
  //   priceMonthly: '$48',
  //   description: 'Dedicated support and infrastructure for your company.',
  //   features: [
  //     'Unlimited products',
  //     'Unlimited subscribers',
  //     'Advanced analytics',
  //     '1-hour, dedicated support response time',
  //     'Marketing automations',
  //   ],
  //   mostPopular: false,
  // },
];
const faqs = [
  {
    id: 1,
    question: 'Why that app exists?',
    answer:
      'There are plenty of great competitors. I created it mainly because of other apps were saving data on these servers or had problems with web & mobile version or export / import of data by API.',
  },
  {
    id: 2,
    question: 'Why I should use it?',
    answer:
      'It is not truth that you should. Tracing finance by general it is tradeoff. You confessing part of your willpower to do it systematically and you gaining knowledge about your spending that allow for better decisions. You can do it with excel or pen and notebook.',
  },
  {
    id: 3,
    question: 'Are my data safe?',
    answer:
      'Your data are stored in localstorage (browsers memory). I do not have access to them but they are not encrypted. You are responsible for setting password to your operating system to protect them.',
  },
  {
    id: 4,
    question: 'Can i recover lost data?',
    answer:
      'No. You can do backups in "Database" view selected from settings menu. If you will loose device with your browser without backup it is impossible to recover them.',
  },
  {
    id: 4,
    question: 'Where to report bug / request feature?',
    answer: [
      'You are invited to open issue on ',
      {
        href: 'https://github.com/gustawdaniel/open_cash_manager/issues',
        text: 'Github',
      },
      ' or reach me on ',
      { href: 'https://twitter.com/_GustawDaniel', text: 'twitter' },
      '. I appreciate any contact from you so do not hesitate to touch with me.',
    ],
  },
  // More questions...
];
const footerNavigation = {
  open: [
    {
      name: 'Github',
      href: 'https://github.com/gustawdaniel/open_cash_manager',
    },
    {
      name: 'Roadmap',
      href: 'https://github.com/gustawdaniel/open_cash_manager/projects/1',
    },
    // { name: 'Sitemap', href: '#' },
  ],
  // TODO: add docs
  support: [
    //   { name: 'Documentation', href: '/docs' },
    { name: 'Guide', href: '/guide' },
    //   { name: 'API Reference', href: '/api' },
  ],
  // TODO: add blog
  community: [
    //   { name: 'About', href: '/about' },
    //   { name: 'Blog', href: '/blog' },
    //   { name: 'Partners', href: '/partners' },
  ],
  legal: [
    // { name: 'Licence', href: '/licence' },
    { name: 'Privacy', href: '/privacy' },
    // { name: 'Terms', href: '/terms' },
  ],
};
</script>

<template>
  <div class="bg-white">
    <!-- Header -->

    <main class="isolate">
      <!-- Hero section -->
      <div class="relative pt-14">
        <div
          aria-hidden="true"
          class="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
        >
          <div
            class="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
            style="
              clip-path: polygon(
                74.1% 44.1%,
                100% 61.6%,
                97.5% 26.9%,
                85.5% 0.1%,
                80.7% 2%,
                72.5% 32.5%,
                60.2% 62.4%,
                52.4% 68.1%,
                47.5% 58.3%,
                45.2% 34.5%,
                27.5% 76.7%,
                0.1% 64.9%,
                17.9% 100%,
                27.6% 76.8%,
                76.1% 97.7%,
                74.1% 44.1%
              );
            "
          />
        </div>
        <div class="py-24 sm:py-32">
          <div class="mx-auto max-w-7xl px-6 lg:px-8">
            <div class="mx-auto max-w-2xl text-center">
              <h1
                class="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl"
              >
                Take control over your personal finance
              </h1>
              <p class="mt-6 text-lg leading-8 text-gray-600">
                Save income, expenses and transfers in many currencies,
                understand how to optimize your spending. For free, using open
                source, without sharing your data with anyone.
              </p>
              <div class="mt-10 flex items-center justify-center gap-x-6">
                <NuxtLink
                  class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                  to="/setup"
                >
                  Get started
                </NuxtLink>
                <NuxtLink
                  class="text-sm font-semibold leading-6 text-gray-900"
                  to="/why"
                >
                  Learn more <span aria-hidden="true">→</span>
                </NuxtLink>
              </div>
            </div>
            <div class="mt-16 flow-root sm:mt-24">
              <div
                class="-m-2 rounded-xl bg-gray-900/5 p-2 ring-1 ring-inset ring-gray-900/10 lg:-m-4 lg:rounded-2xl lg:p-4"
              >
                <img
                  alt="App screenshot"
                  class="rounded-md shadow-2xl ring-1 ring-gray-900/10 w-full"
                  height="537"
                  src="~/assets/screenshots/open-cash-manager-shot-1.webp"
                  width="1054"
                />
                <!--                <img-->
                <!--                  alt="App screenshot"-->
                <!--                  class="rounded-md shadow-2xl ring-1 ring-gray-900/10"-->
                <!--                  height="1442"-->
                <!--                  src="https://tailwindui.com/img/component-images/project-app-screenshot.png"-->
                <!--                  width="2432"-->
                <!--                />-->
              </div>
            </div>
          </div>
        </div>
        <div
          aria-hidden="true"
          class="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]"
        >
          <div
            class="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
            style="
              clip-path: polygon(
                74.1% 44.1%,
                100% 61.6%,
                97.5% 26.9%,
                85.5% 0.1%,
                80.7% 2%,
                72.5% 32.5%,
                60.2% 62.4%,
                52.4% 68.1%,
                47.5% 58.3%,
                45.2% 34.5%,
                27.5% 76.7%,
                0.1% 64.9%,
                17.9% 100%,
                27.6% 76.8%,
                76.1% 97.7%,
                74.1% 44.1%
              );
            "
          />
        </div>
      </div>

      <!-- Logo cloud -->
      <div class="mx-auto max-w-7xl px-6 lg:px-8">
        <div
          class="mx-auto grid max-w-lg grid-cols-4 items-center gap-x-8 gap-y-12 sm:max-w-xl sm:grid-cols-6 sm:gap-x-10 sm:gap-y-14 lg:mx-0 lg:max-w-none lg:grid-cols-3"
        >
          <img
            v-for="logo in logos"
            :key="logo.name"
            :alt="logo.name"
            :src="logo.image"
            class="col-span-2 max-h-8 w-full object-contain lg:col-span-1"
            height="48"
            style="
              filter: opacity(0.9) grayscale(100%)
                drop-shadow(0 0 0 rgb(17, 24, 39));
            "
            width="158"
          />
        </div>
        <div class="mt-16 flex justify-center">
          <p
            class="relative rounded-full px-4 py-1.5 text-sm leading-6 text-gray-600 ring-1 ring-inset ring-gray-900/10 hover:ring-gray-900/20"
          >
            <span class="hidden md:inline"
              >In any endeavor, the initial act of measuring progress is the
              cornerstone of eventual success.</span
            >
            <NuxtLink class="font-semibold text-indigo-600" to="/why"
              ><span aria-hidden="true" class="absolute inset-0" /> Benefits of
              personal finance tracking
              <span aria-hidden="true">&rarr;</span></NuxtLink
            >
          </p>
        </div>
      </div>

      <!-- Feature section -->
      <div class="mx-auto mt-32 max-w-7xl px-6 sm:mt-56 lg:px-8">
        <div class="mx-auto max-w-2xl lg:text-center">
          <h2 class="text-base font-semibold leading-7 text-indigo-600">
            Gain power
          </h2>
          <p
            class="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
          >
            Achieve financial freedom
          </p>
          <p class="mt-6 text-lg leading-8 text-gray-600">
            Tracking personal finances can be a game-changer when it comes to
            financial control. With the right app, you can effortlessly keep
            tabs on your income, expenses, and investments, helping you make
            informed decisions about your money.
          </p>
        </div>
        <div class="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
          <dl
            class="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-2 lg:gap-y-16"
          >
            <div
              v-for="feature in features"
              :key="feature.name"
              class="relative pl-16"
            >
              <dt class="text-base font-semibold leading-7 text-gray-900">
                <div
                  class="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600"
                >
                  <component
                    :is="feature.icon"
                    aria-hidden="true"
                    class="h-6 w-6 text-white"
                  />
                </div>
                {{ feature.name }}
              </dt>
              <dd class="mt-2 text-base leading-7 text-gray-600">
                {{ feature.description }}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <!-- Testimonial section -->
      <div class="mx-auto mt-32 max-w-7xl sm:mt-56 sm:px-6 lg:px-8">
        <div
          class="relative overflow-hidden bg-gray-900 px-6 py-20 shadow-xl sm:rounded-3xl sm:px-10 sm:py-24 md:px-12 lg:px-20"
        >
          <img
            alt=""
            class="absolute inset-0 h-full w-full object-cover brightness-150 saturate-0"
            src="https://images.unsplash.com/photo-1601381718415-a05fb0a261f3?ixid=MXwxMjA3fDB8MHxwcm9maWxlLXBhZ2V8ODl8fHxlbnwwfHx8&ixlib=rb-1.2.1&auto=format&fit=crop&w=1216&q=80"
          />
          <div class="absolute inset-0 bg-gray-900/90 mix-blend-multiply" />
          <div
            aria-hidden="true"
            class="absolute -left-80 -top-56 transform-gpu blur-3xl"
          >
            <div
              class="aspect-[1097/845] w-[68.5625rem] bg-gradient-to-r from-[#ff4694] to-[#776fff] opacity-[0.45]"
              style="
                clip-path: polygon(
                  74.1% 44.1%,
                  100% 61.6%,
                  97.5% 26.9%,
                  85.5% 0.1%,
                  80.7% 2%,
                  72.5% 32.5%,
                  60.2% 62.4%,
                  52.4% 68.1%,
                  47.5% 58.3%,
                  45.2% 34.5%,
                  27.5% 76.7%,
                  0.1% 64.9%,
                  17.9% 100%,
                  27.6% 76.8%,
                  76.1% 97.7%,
                  74.1% 44.1%
                );
              "
            />
          </div>
          <div
            aria-hidden="true"
            class="hidden md:absolute md:bottom-16 md:left-[50rem] md:block md:transform-gpu md:blur-3xl"
          >
            <div
              class="aspect-[1097/845] w-[68.5625rem] bg-gradient-to-r from-[#ff4694] to-[#776fff] opacity-25"
              style="
                clip-path: polygon(
                  74.1% 44.1%,
                  100% 61.6%,
                  97.5% 26.9%,
                  85.5% 0.1%,
                  80.7% 2%,
                  72.5% 32.5%,
                  60.2% 62.4%,
                  52.4% 68.1%,
                  47.5% 58.3%,
                  45.2% 34.5%,
                  27.5% 76.7%,
                  0.1% 64.9%,
                  17.9% 100%,
                  27.6% 76.8%,
                  76.1% 97.7%,
                  74.1% 44.1%
                );
              "
            />
          </div>
          <div class="relative mx-auto max-w-2xl lg:mx-0">
            <figure>
              <blockquote
                class="mt-6 text-lg font-semibold text-white sm:text-xl sm:leading-8"
              >
                <p>
                  “If we command our wealth, we shall be rich and free. If our
                  wealth commands us, we are poor indeed.” —
                </p>
              </blockquote>
              <figcaption class="mt-6 text-base text-white">
                <div class="font-semibold">Edmund Burke</div>
                <div class="mt-1">Former British Paymaster of the Forces</div>
              </figcaption>
            </figure>
          </div>
        </div>
      </div>

      <!-- Pricing section -->
      <div class="py-24 sm:pt-48">
        <div class="mx-auto max-w-7xl px-6 lg:px-8">
          <div class="mx-auto max-w-4xl text-center">
            <h2 class="text-base font-semibold leading-7 text-indigo-600">
              Pricing
            </h2>
            <p
              class="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl"
            >
              Fair Pricing
            </p>
          </div>
          <p
            class="mx-auto mt-6 max-w-2xl text-center text-lg leading-8 text-gray-600"
          >
            This is early access any all features in current version of app will
            be available for free forever. Only thing I need from you is
            feedback.
          </p>
          <div
            class="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-3"
          >
            <div
              v-for="tier in tiers"
              :key="tier.id"
              :class="[
                'flex flex-col justify-between rounded-3xl bg-white p-8 ring-1 ring-gray-200 xl:p-10 lg:col-start-2',
              ]"
            >
              <div>
                <div class="flex items-center justify-between gap-x-4">
                  <h3
                    :id="tier.id"
                    :class="[
                      'text-indigo-600',
                      'text-lg font-semibold leading-8',
                    ]"
                  >
                    {{ tier.name }}
                  </h3>
                  <p
                    class="rounded-full bg-indigo-600/10 px-2.5 py-1 text-xs font-semibold leading-5 text-indigo-600"
                  >
                    Early adopter
                  </p>
                </div>
                <p class="mt-4 text-sm leading-6 text-gray-600">
                  {{ tier.description }}
                </p>
                <p class="mt-6 flex items-baseline gap-x-1">
                  <span
                    class="text-4xl font-bold tracking-tight text-gray-900"
                    >{{ tier.priceMonthly }}</span
                  >
                  <span class="text-sm font-semibold leading-6 text-gray-600"
                    >/month</span
                  >
                </p>
                <ul
                  class="mt-8 space-y-3 text-sm leading-6 text-gray-600"
                  role="list"
                >
                  <li
                    v-for="feature in tier.features"
                    :key="feature"
                    class="flex gap-x-3"
                  >
                    <CheckIcon
                      aria-hidden="true"
                      class="h-6 w-5 flex-none text-indigo-600"
                    />
                    {{ feature }}
                  </li>
                </ul>
              </div>
              <NuxtLink
                :aria-describedby="tier.id"
                :class="[
                  tier.mostPopular
                    ? 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-500'
                    : 'text-indigo-600 ring-1 ring-inset ring-indigo-200 hover:ring-indigo-300',
                  'mt-8 block rounded-md py-2 px-3 text-center text-sm font-semibold leading-6 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600',
                ]"
                :to="tier.to"
              >
                Get started
              </NuxtLink>
            </div>
          </div>
        </div>
      </div>

      <!-- FAQs -->
      <div
        class="mx-auto max-w-2xl divide-y divide-gray-900/10 px-6 pb-8 sm:pb-24 sm:pt-12 lg:max-w-7xl lg:px-8 lg:pb-32"
      >
        <h2 class="text-2xl font-bold leading-10 tracking-tight text-gray-900">
          Frequently asked questions
        </h2>
        <dl class="mt-10 space-y-8 divide-y divide-gray-900/10">
          <div
            v-for="faq in faqs"
            :key="faq.id"
            class="pt-8 lg:grid lg:grid-cols-12 lg:gap-8"
          >
            <dt
              class="text-base font-semibold leading-7 text-gray-900 lg:col-span-5"
            >
              {{ faq.question }}
            </dt>
            <dd class="mt-4 lg:col-span-7 lg:mt-0">
              <p
                v-if="typeof faq.answer === 'string'"
                class="text-base leading-7 text-gray-600"
              >
                {{ faq.answer }}
              </p>
              <p
                v-else-if="Array.isArray(faq.answer)"
                class="text-base leading-7 text-gray-600"
              >
                <template v-for="(part, key) of faq.answer" :key="key">
                  <span v-if="typeof part === 'string'">{{ part }}</span>
                  <a
                    v-else-if="typeof part === 'object'"
                    :href="part.href"
                    class="text-indigo-700 hover:text-indigo-800"
                  >
                    {{ part.text }}
                  </a>
                </template>
              </p>
            </dd>
          </div>
        </dl>
      </div>

      <!-- CTA section -->
      <div class="relative -z-10 mt-32 px-6 lg:px-8">
        <div
          aria-hidden="true"
          class="absolute inset-x-0 top-1/2 -z-10 flex -translate-y-1/2 transform-gpu justify-center overflow-hidden blur-3xl sm:bottom-0 sm:right-[calc(50%-6rem)] sm:top-auto sm:translate-y-0 sm:transform-gpu sm:justify-end"
        >
          <div
            class="aspect-[1108/632] w-[69.25rem] flex-none bg-gradient-to-r from-[#ff80b5] to-[#9089fc] opacity-25"
            style="
              clip-path: polygon(
                73.6% 48.6%,
                91.7% 88.5%,
                100% 53.9%,
                97.4% 18.1%,
                92.5% 15.4%,
                75.7% 36.3%,
                55.3% 52.8%,
                46.5% 50.9%,
                45% 37.4%,
                50.3% 13.1%,
                21.3% 36.2%,
                0.1% 0.1%,
                5.4% 49.1%,
                21.4% 36.4%,
                58.9% 100%,
                73.6% 48.6%
              );
            "
          />
        </div>
        <div class="mx-auto max-w-2xl text-center">
          <h2
            class="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
          >
            Any journey start with first step.<br />Start using our app today.
          </h2>
          <p class="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-600">
            Establishing habits can be an uphill battle, but the rewards are
            undeniably impressive. When you make financial tracking a habit, the
            results are clearly reflected in your financial progress.
          </p>
          <div class="mt-10 flex items-center justify-center gap-x-6">
            <NuxtLink
              class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              to="/setup"
              >Get started
            </NuxtLink>
            <NuxtLink
              class="text-sm font-semibold leading-6 text-gray-900"
              to="/why"
              >Learn more <span aria-hidden="true">→</span></NuxtLink
            >
          </div>
        </div>
        <div
          aria-hidden="true"
          class="absolute left-1/2 right-0 top-full -z-10 hidden -translate-y-1/2 transform-gpu overflow-hidden blur-3xl sm:block"
        >
          <div
            class="aspect-[1155/678] w-[72.1875rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30"
            style="
              clip-path: polygon(
                74.1% 44.1%,
                100% 61.6%,
                97.5% 26.9%,
                85.5% 0.1%,
                80.7% 2%,
                72.5% 32.5%,
                60.2% 62.4%,
                52.4% 68.1%,
                47.5% 58.3%,
                45.2% 34.5%,
                27.5% 76.7%,
                0.1% 64.9%,
                17.9% 100%,
                27.6% 76.8%,
                76.1% 97.7%,
                74.1% 44.1%
              );
            "
          />
        </div>
      </div>
    </main>

    <!-- Footer -->
    <div class="mx-auto mt-32 max-w-7xl px-6 lg:px-8">
      <footer
        aria-labelledby="footer-heading"
        class="relative border-t border-gray-900/10 py-24 sm:mt-56 sm:py-32"
      >
        <h2 id="footer-heading" class="sr-only">Footer</h2>
        <div class="xl:grid xl:grid-cols-3 xl:gap-8">
          <img
            alt="Company name"
            class="h-7"
            src="https://tailwindui.com/img/logos/mark.svg?color=indigo&shade=600"
          />
          <div class="mt-16 grid grid-cols-2 gap-8 xl:col-span-2 xl:mt-0">
            <div class="md:grid md:grid-cols-2 md:gap-8">
              <div>
                <h3 class="text-sm font-semibold leading-6 text-gray-900">
                  Open Software
                </h3>
                <ul class="mt-6 space-y-4" role="list">
                  <li v-for="item in footerNavigation.open" :key="item.name">
                    <a
                      :href="item.href"
                      class="text-sm leading-6 text-gray-600 hover:text-gray-900"
                      >{{ item.name }}</a
                    >
                  </li>
                </ul>
              </div>
              <div v-if="footerNavigation.support.length" class="mt-10 md:mt-0">
                <h3 class="text-sm font-semibold leading-6 text-gray-900">
                  Support
                </h3>
                <ul class="mt-6 space-y-4" role="list">
                  <li v-for="item in footerNavigation.support" :key="item.name">
                    <a
                      v-if="item.href.startsWith('https')"
                      :href="item.href"
                      class="text-sm leading-6 text-gray-600 hover:text-gray-900"
                    >
                      {{ item.name }}
                    </a>
                    <NuxtLink
                      v-else-if="item.href.startsWith('/')"
                      :to="item.href"
                      class="text-sm leading-6 text-gray-600 hover:text-gray-900"
                    >
                      {{ item.name }}
                    </NuxtLink>
                  </li>
                </ul>
              </div>
            </div>
            <div class="md:grid md:grid-cols-2 md:gap-8">
              <div v-if="footerNavigation.community.length">
                <h3 class="text-sm font-semibold leading-6 text-gray-900">
                  Community
                </h3>
                <ul class="mt-6 space-y-4" role="list">
                  <li
                    v-for="item in footerNavigation.community"
                    :key="item.name"
                  >
                    <a
                      :href="item.href"
                      class="text-sm leading-6 text-gray-600 hover:text-gray-900"
                      >{{ item.name }}</a
                    >
                  </li>
                </ul>
              </div>
              <div class="mt-10 md:mt-0">
                <h3 class="text-sm font-semibold leading-6 text-gray-900">
                  Legal
                </h3>
                <ul class="mt-6 space-y-4" role="list">
                  <li v-for="item in footerNavigation.legal" :key="item.name">
                    <a
                      :href="item.href"
                      class="text-sm leading-6 text-gray-600 hover:text-gray-900"
                      >{{ item.name }}</a
                    >
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  </div>
</template>
