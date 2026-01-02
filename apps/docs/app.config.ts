export default defineAppConfig({
    seo: {
        titleTemplate: '%s - VaultTracker',
        title: 'VaultTracker',
        description: 'Documentation for VaultTracker - Personal Finance App',
        ogImage: '/social-card-preview.png',
    },
    header: {
        title: 'VaultTracker',
        showLinkIcon: true,
        exclude: [],
        fluid: true
    },
    socials: {
        github: 'gustawdaniel/vault-track',
    },
    github: {
        url: 'https://github.com/gustawdaniel/vault-track',
        branch: 'main',
        rootDir: 'apps/docs',
        edit: true,
        releases: true
    },
    toc: {
        title: 'On this page',
        bottom: {
            title: 'Community',
            links: [{
                icon: 'i-heroicons-code-bracket',
                label: 'Source Code',
                to: 'https://github.com/gustawdaniel/vault-track',
                target: '_blank'
            }]
        }
    },
    aside: {
        level: 0,
        collapsed: false,
        exclude: []
    },
    main: {
        padded: true,
        fluid: true
    }
})
