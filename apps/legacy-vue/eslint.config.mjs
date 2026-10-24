
import withNuxt from './.nuxt/eslint.config.mjs'

export default withNuxt().overrideRules({
    'vue/multi-word-component-names': 'off',
    'vue/no-multiple-template-root': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    'vue/return-in-computed-property': 'off',
    'vue/html-self-closing': ['error', {
        html: {
            void: 'always',
            normal: 'always',
            component: 'always'
        },
        svg: 'always',
        math: 'always'
    }]
})
