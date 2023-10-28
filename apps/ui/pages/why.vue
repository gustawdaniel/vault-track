<script lang="ts" setup>
import {
  CloudArrowUpIcon,
  LockClosedIcon,
  ServerIcon,
} from '@heroicons/vue/20/solid';
</script>

<template>
  <div class="relative isolate overflow-hidden bg-white py-24 sm:py-32">
    <div
      aria-hidden="true"
      class="absolute -top-80 left-[max(6rem,33%)] -z-10 transform-gpu blur-3xl sm:left-1/2 md:top-20 lg:ml-20 xl:top-3 xl:ml-56"
    >
      <div
        class="aspect-[801/1036] w-[50.0625rem] bg-gradient-to-tr from-[#ff80b5] to-[#9089fc] opacity-30"
        style="
          clip-path: polygon(
            63.1% 29.6%,
            100% 17.2%,
            76.7% 3.1%,
            48.4% 0.1%,
            44.6% 4.8%,
            54.5% 25.4%,
            59.8% 49.1%,
            55.3% 57.9%,
            44.5% 57.3%,
            27.8% 48%,
            35.1% 81.6%,
            0% 97.8%,
            39.3% 100%,
            35.3% 81.5%,
            97.2% 52.8%,
            63.1% 29.6%
          );
        "
      />
    </div>
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <div class="mx-auto max-w-2xl lg:mx-0">
        <p
          class="text-lg font-semibold leading-8 tracking-tight text-indigo-600"
        >
          Start with Why
        </p>
        <h1
          class="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl"
        >
          Benefits of personal finance tracking
        </h1>
        <p class="mt-6 text-xl leading-8 text-gray-700">
          Making wise financial decisions empowers you to reclaim your time and
          allocate it according to your true needs. Time is arguably the most
          precious resource in your life, and as the adage goes, time is money.
          When you track and value your time, you can apply the same principles
          to your finances.
        </p>
      </div>
      <div
        class="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:mx-0 lg:mt-10 lg:max-w-none lg:grid-cols-12"
      >
        <div class="relative lg:order-last lg:col-span-5">
          <svg
            aria-hidden="true"
            class="absolute -top-[40rem] left-1 -z-10 h-[64rem] w-[175.5rem] -translate-x-1/2 stroke-gray-900/10 [mask-image:radial-gradient(64rem_64rem_at_111.5rem_0%,white,transparent)]"
          >
            <defs>
              <pattern
                id="e87443c8-56e4-4c20-9111-55b82fa704e3"
                height="200"
                patternUnits="userSpaceOnUse"
                width="200"
              >
                <path d="M0.5 0V200M200 0.5L0 0.499983" />
              </pattern>
            </defs>
            <rect
              fill="url(#e87443c8-56e4-4c20-9111-55b82fa704e3)"
              height="100%"
              stroke-width="0"
              width="100%"
            />
          </svg>
          <figure class="border-l border-indigo-600 pl-8">
            <blockquote
              class="text-xl font-semibold leading-8 tracking-tight text-gray-900"
            >
              <p>
                “Your net worth to the world is usually determined by what
                remains after your bad habits are subtracted from your good
                ones.”
              </p>
            </blockquote>
            <figcaption class="mt-8 flex gap-x-4">
              <img
                alt=""
                class="mt-1 h-10 w-10 flex-none rounded-full bg-gray-50"
                src="~/assets/benjamin-franklin.png"
              />
              <div class="text-sm leading-6">
                <div class="font-semibold text-gray-900">Benjamin Franklin</div>
                <div class="text-gray-600">
                  Founding Father of the United States
                </div>
              </div>
            </figcaption>
          </figure>
        </div>
        <div class="max-w-xl text-base leading-7 text-gray-700 lg:col-span-7">
          <p>
            Every business monitors its revenue and expenditures, conducts
            analyses, creates forecasts, and bases decisions on this data.
            Similarly, you can apply these principles to your personal financial
            data. While it won't instantly make you wealthy, it serves as the
            initial step in facilitating future decisions that can lead to
            financial prosperity.
          </p>
          <ul class="mt-8 max-w-xl space-y-8 text-gray-600" role="list">
            <li class="flex gap-x-3">
              <CloudArrowUpIcon
                aria-hidden="true"
                class="mt-1 h-5 w-5 flex-none text-indigo-600"
              />
              <span>
                <strong class="font-semibold text-gray-900">
                  Budgeting and Financial Awareness.
                </strong>
                By diligently tracking your expenses, you gain a clear
                understanding of where your money is going. This awareness is
                the foundation of effective budgeting. It allows you to
                categorize your spending, identify unnecessary expenses, and
                allocate your resources more efficiently. As a result, you can
                create a realistic budget that aligns with your financial goals,
                whether it's saving for a vacation, paying off debt, or building
                an emergency fund.
              </span>
            </li>
            <li class="flex gap-x-3">
              <LockClosedIcon
                aria-hidden="true"
                class="mt-1 h-5 w-5 flex-none text-indigo-600"
              />
              <span>
                <strong class="font-semibold text-gray-900">
                  Expense Control and Financial Discipline.
                </strong>
                Tracking your expenses promotes financial discipline. When you
                record each expenditure, you become more mindful of your
                spending habits. This heightened awareness can help you curb
                impulsive or frivolous purchases and stick to your budget. Over
                time, this discipline can lead to significant savings and a
                stronger financial position.
              </span>
            </li>
            <li class="flex gap-x-3">
              <ServerIcon
                aria-hidden="true"
                class="mt-1 h-5 w-5 flex-none text-indigo-600"
              />
              <span>
                <strong class="font-semibold text-gray-900">
                  Goal Achievement and Financial Security.
                </strong>
                Expense tracking plays a crucial role in achieving your
                financial goals. Whether you're working towards a major
                purchase, retirement, or debt reduction, knowing where your
                money is going is essential. With this knowledge, you can make
                informed decisions about how to allocate your resources, set
                achievable milestones, and track your progress. Ultimately, this
                process enhances your financial security and provides a roadmap
                to your desired financial future.
              </span>
            </li>
          </ul>
          <p class="mt-8">
            Tracking your expenses is worth it because it enables you to budget
            effectively, exercise financial discipline, and work toward your
            financial goals. It's a fundamental practice that can lead to
            improved financial awareness and better control over your financial
            well-being.
          </p>
          <h2 class="mt-16 text-2xl font-bold tracking-tight text-gray-900">
            Before you start.
          </h2>
          <p class="mt-6">
            Simply starting but then discontinuing after a few days won't yield
            results. To make lasting changes, you must understand your personal
            motivation for tracking your finances. If you're uncertain about
            establishing the habit, consider researching strategies for habit
            formation.
          </p>
        </div>
      </div>
    </div>

    <div class="bg-white">
      <div class="mx-auto max-w-7xl py-24 sm:px-6 sm:py-32 lg:px-8">
        <div
          class="relative isolate overflow-hidden px-6 py-24 text-center shadow-2xl sm:rounded-3xl sm:px-16"
        >
          <h2
            class="mx-auto max-w-2xl text-3xl font-bold tracking-tight sm:text-4xl"
          >
            Start using app.
          </h2>
          <p class="mx-auto mt-6 max-w-xl text-lg leading-8 text-gray-700">
            You can start creating accounts and adding transactions manually or
            import your data. If you have custom data format create
            <a
              class="text-indigo-700 hover:text-indigo-800"
              href="https://github.com/gustawdaniel/open_cash_manager/issues"
              >Github Issue</a
            >
            with anonymized content.
          </p>
          <div class="mt-10 flex items-center justify-center gap-x-6">
            <NuxtLink
              class="rounded-md bg-indigo-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              href="/setup"
              >Get started
            </NuxtLink>
            <a
              class="text-sm font-semibold leading-6 text-gray-900"
              href="https://docs.opencash.app/"
            >
              Learn more <span aria-hidden="true">→</span>
            </a>
          </div>
          <svg
            aria-hidden="true"
            class="absolute left top-1/2 -z-10 h-[64rem] w-[64rem] -translate-x-1/2 [mask-image:radial-gradient(closest-side,white,transparent)]"
            viewBox="0 0 1024 1024"
          >
            <circle
              cx="512"
              cy="512"
              fill="url(#827591b1-ce8c-4110-b064-7cb85a0b1217)"
              fill-opacity="0.7"
              r="512"
            />
            <defs>
              <radialGradient id="827591b1-ce8c-4110-b064-7cb85a0b1217">
                <stop stop-color="#7775D6" />
                <stop offset="1" stop-color="#E935C1" />
              </radialGradient>
            </defs>
          </svg>
        </div>
      </div>
    </div>
  </div>
</template>
