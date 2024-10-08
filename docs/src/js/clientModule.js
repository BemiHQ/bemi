import ExecutionEnvironment from '@docusaurus/ExecutionEnvironment';

// On the initial load
if (ExecutionEnvironment.canUseDOM) {
  // Clarity tracking
  (function(c,l,a,r,i,t,y){
    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  })(window, document, "clarity", "script", "k7fylontp5");

  // Live chat
  (function(d,t) {
    var BASE_URL="https://app.chatwoot.com";
    var g=d.createElement(t),s=d.getElementsByTagName(t)[0];
    g.src=BASE_URL+"/packs/js/sdk.js";
    g.defer = true;
    g.async = true;
    s.parentNode.insertBefore(g,s);
    g.onload=function(){
      window.chatwootSDK.run({
        websiteToken: '3LSfgXvtGLaJySJtoVuS8wok',
        baseUrl: BASE_URL
      })
    }
  })(document,"script");

  // Koala tracking
  !function(t){if(window.ko)return;window.ko=[],["identify","track","removeListeners","open","on","off","qualify","ready"].forEach(function(t){ko[t]=function(){var n=[].slice.call(arguments);return n.unshift(t),ko.push(n),ko}});var n=document.createElement("script");n.async=!0,n.setAttribute("src","https://cdn.getkoala.com/v1/pk_e3caa97254c50b34a600ed2277dd29336c65/sdk.js"),(document.body || document.head).appendChild(n)}();  
}

export function onRouteDidUpdate() {
  // Github buttons
  const script = document.createElement("script");
  script.setAttribute("src", "https://buttons.github.io/buttons.js");
  script.setAttribute("async", true);
  script.setAttribute("defer", true);
  document.body.appendChild(script);

  // Open external links in new tab
  const links = document.getElementsByTagName("a");
  [...links].forEach((link) => {
    if (link.hostname !== location.hostname) {
      link.target = "_blank";
    }
  });
}
