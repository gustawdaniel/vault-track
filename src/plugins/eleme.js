import Vue from 'vue';
import { Cascader, DatePicker } from 'element-ui';
// import '../assets/element-variables.scss'
import 'element-ui/lib/theme-chalk/index.css';

import lang from 'element-ui/lib/locale/lang/en'
import locale from 'element-ui/lib/locale'

locale.use(lang);

Vue.use(DatePicker)
Vue.use(Cascader)
