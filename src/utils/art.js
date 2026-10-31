// 登录页 / 个人页用的插画 —— 内联 SVG，离线可用、不依赖任何图片文件

const CAMPUS_BG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0.15" y2="1">
<stop offset="0" stop-color="#DCF0D8"/><stop offset="45%" stop-color="#EEF8E9"/><stop offset="100%" stop-color="#FBFDF5"/>
</linearGradient>
<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#FEF9EC"/><stop offset="100%" stop-color="#EFE6CD"/>
</linearGradient>
<radialGradient id="c1" cx="45%" cy="35%" r="72%">
<stop offset="0" stop-color="#C6E9B2"/><stop offset="62%" stop-color="#A5D995"/><stop offset="100%" stop-color="#86C67A"/>
</radialGradient>
<radialGradient id="c2" cx="45%" cy="35%" r="72%">
<stop offset="0" stop-color="#E2F3D2"/><stop offset="100%" stop-color="#B7E0A5"/>
</radialGradient>
<pattern id="win" width="52" height="62" patternUnits="userSpaceOnUse">
<rect x="10" y="14" width="32" height="36" rx="4" fill="#DFEBD6" fill-opacity="0.9"/>
</pattern>
<pattern id="win2" width="44" height="54" patternUnits="userSpaceOnUse">
<rect x="8" y="12" width="28" height="30" rx="3" fill="#E7F0DC" fill-opacity="0.85"/>
</pattern>
</defs>
<rect width="1440" height="900" fill="url(#sky)"/>
<circle cx="1180" cy="120" r="230" fill="#FFFFFF" fill-opacity="0.5"/>
<circle cx="1180" cy="120" r="150" fill="#FFFFFF" fill-opacity="0.55"/>
<g fill="#FFFFFF" fill-opacity="0.16">
<path d="M980 0 L1080 0 L840 900 L700 900 Z"/>
<path d="M1200 0 L1290 0 L1120 900 L1010 900 Z"/>
</g>
<rect x="420" y="330" width="620" height="320" rx="12" fill="url(#wall)" fill-opacity="0.55"/>
<rect x="60" y="300" width="360" height="350" rx="12" fill="url(#wall)"/>
<rect x="60" y="300" width="360" height="20" rx="10" fill="#E6DCBF" fill-opacity="0.85"/>
<rect x="80" y="330" width="320" height="300" fill="url(#win)"/>
<rect x="1120" y="270" width="330" height="380" rx="12" fill="url(#wall)"/>
<rect x="1120" y="270" width="330" height="18" rx="9" fill="#E6DCBF" fill-opacity="0.85"/>
<rect x="1140" y="300" width="290" height="330" fill="url(#win2)"/>
<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EFF7E3"/><stop offset="100%" stop-color="#F7FBEF"/></linearGradient>
<rect y="626" width="1440" height="274" fill="url(#ground)"/>
<path d="M0 668 Q 380 628 720 662 T 1440 646 L1440 900 L0 900 Z" fill="#E9F3DA" fill-opacity="0.85"/>
<path d="M470 900 L560 660 L880 660 L1010 900 Z" fill="#F6FAEC"/>
<g fill="#B9E0A6">
<ellipse cx="180" cy="700" rx="90" ry="42"/>
<ellipse cx="300" cy="716" rx="70" ry="34"/>
<ellipse cx="1180" cy="706" rx="80" ry="38"/>
</g>
<g stroke="#D9E4C6" stroke-width="6" stroke-linecap="round" fill="none" opacity="0.9">
<path d="M1050 880 L1050 730"/><path d="M1110 880 L1110 720"/>
<path d="M1170 880 L1170 726"/><path d="M1230 880 L1230 734"/>
<path d="M1040 762 L1240 754"/>
</g>
<g>
<ellipse cx="80" cy="130" rx="300" ry="230" fill="url(#c1)"/>
<ellipse cx="250" cy="30" rx="230" ry="160" fill="url(#c2)"/>
<ellipse cx="-50" cy="260" rx="250" ry="190" fill="url(#c1)"/>
</g>
<g>
<ellipse cx="1400" cy="100" rx="290" ry="220" fill="url(#c2)"/>
<ellipse cx="1250" cy="10" rx="210" ry="150" fill="url(#c1)"/>
</g>
</svg>`

const CLIPBOARD_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 150">
<rect x="14" y="20" width="82" height="112" rx="12" fill="#FFFFFF" fill-opacity="0.55" stroke="#3FBFA0" stroke-width="3"/>
<rect x="38" y="8" width="34" height="18" rx="7" fill="#3FBFA0"/>
<g stroke="#3FBFA0" stroke-width="2.6" fill="none">
<rect x="28" y="48" width="14" height="14" rx="3.5"/>
<rect x="28" y="74" width="14" height="14" rx="3.5"/>
<rect x="28" y="100" width="14" height="14" rx="3.5"/>
</g>
<g stroke="#BFDCCF" stroke-width="3.2" stroke-linecap="round">
<line x1="52" y1="55" x2="84" y2="55"/>
<line x1="52" y1="81" x2="84" y2="81"/>
<line x1="52" y1="107" x2="84" y2="107"/>
</g>
<circle cx="94" cy="120" r="17" fill="#FFFFFF" stroke="#3FBFA0" stroke-width="3"/>
<path d="M86 120 l6 7 l12 -15" fill="none" stroke="#3FBFA0" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`


// 手机端登录页顶部插画：清单 + 纸飞机 + 教学楼 + 勾选圆
const MOBILE_ART_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 375 250">
<defs>
<linearGradient id="hill" x1="0" y1="0" x2="0" y2="1">
<stop offset="0" stop-color="#BEE6C4"/><stop offset="100%" stop-color="#DCF2DC"/>
</linearGradient>
<linearGradient id="cbg" x1="0" y1="0" x2="1" y2="1">
<stop offset="0" stop-color="#FFFFFF"/><stop offset="100%" stop-color="#E9F6E4"/>
</linearGradient>
</defs>
<path d="M0 196 Q 90 166 190 190 T 375 180 L375 250 L0 250 Z" fill="url(#hill)"/>
<rect x="26" y="150" width="6" height="44" rx="3" fill="#7FBF8C"/>
<circle cx="29" cy="130" r="27" fill="#8FCF9C"/>
<circle cx="17" cy="146" r="16" fill="#A6DCAF"/>
<g transform="rotate(-12 120 92)">
<rect x="64" y="40" width="106" height="122" rx="10" fill="url(#cbg)" stroke="#CFE7D2" stroke-width="2"/>
<rect x="79" y="58" width="12" height="12" rx="3" fill="#8FCF9C"/>
<rect x="99" y="60" width="54" height="7" rx="3.5" fill="#CFE7D2"/>
<rect x="79" y="84" width="12" height="12" rx="3" fill="#8FCF9C"/>
<rect x="99" y="86" width="54" height="7" rx="3.5" fill="#CFE7D2"/>
<rect x="79" y="110" width="12" height="12" rx="3" fill="#8FCF9C"/>
<rect x="99" y="112" width="40" height="7" rx="3.5" fill="#CFE7D2"/>
</g>
<g>
<path d="M196 44 L248 28 L215 70 Z" fill="#FFFFFF" stroke="#DCEBD8" stroke-width="2"/>
<path d="M215 70 L219 52 L248 28" fill="none" stroke="#E6F1E0" stroke-width="2"/>
</g>
<g>
<rect x="268" y="132" width="94" height="62" fill="#FDFBF2" stroke="#E3EBD9" stroke-width="2"/>
<path d="M261 132 L315 102 L369 132 Z" fill="#F4F0E1"/>
<rect x="278" y="150" width="9" height="44" fill="#EDE8D6"/>
<rect x="298" y="150" width="9" height="44" fill="#EDE8D6"/>
<rect x="318" y="150" width="9" height="44" fill="#EDE8D6"/>
<rect x="338" y="150" width="9" height="44" fill="#EDE8D6"/>
<rect x="306" y="176" width="18" height="18" fill="#DDEBD6"/>
</g>
<circle cx="238" cy="140" r="26" fill="#3FBFA0"/>
<path d="M226 140 l9 10 l17 -20" fill="none" stroke="#FFFFFF" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`

const toUrl = (svg) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)

export const CAMPUS_BG = toUrl(CAMPUS_BG_SVG)
export const CLIPBOARD_ART = toUrl(CLIPBOARD_SVG)
export const MOBILE_ART = toUrl(MOBILE_ART_SVG)
