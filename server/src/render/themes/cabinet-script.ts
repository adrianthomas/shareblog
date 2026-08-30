// Cabinet's feed remains a collection of ordinary links. This script only
// upgrades same-origin, unmodified clicks into an in-place detail experience;
// a missing API, failed response, or malformed detail falls back to the real URL.
export const cabinetScript = `
(function () {
  'use strict';
  var SHARED_SELECTOR = '[data-cabinet-shared]';
  var PROGRESS_SELECTOR = '.cabinet-reading-progress > span';
  var ACKNOWLEDGE_MS = 105, OPEN_MS = 580, CLOSE_MS = 460;
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var current = null, sequence = 0, scrollLock = null;
  function clamp(value, minimum, maximum) { return Math.max(minimum, Math.min(maximum, value)); }
  function delay(milliseconds) {
    return new Promise(function (resolve) { window.setTimeout(resolve, milliseconds); });
  }
  function isDirectDetailPage() { return !!(document.querySelector('main#main-content') && document.querySelector('.cabinet-close')); }
  function closestCard(node) {
    while (node && node !== document) {
      if (node.nodeType === 1 && node.hasAttribute('data-cabinet-card')) return node;
      node = node.parentNode;
    }
    return null;
  }
  function ancestorWithClass(node, className) {
    while (node && node !== document) {
      if (node.nodeType === 1 && node.classList.contains(className)) return node;
      node = node.parentNode;
    }
    return null;
  }
  function itemForLink(link) { return ancestorWithClass(link, 'cabinet-item') || link; }
  function artifactForLink(link, item) { return ancestorWithClass(link, 'cabinet-artifact') || item.querySelector('.cabinet-artifact') || item; }
  function isUnmodifiedLeftClick(event) {
    return !event.defaultPrevented && event.button === 0 &&
      !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
  }
  function sameOriginNavigableLink(link) {
    if (!link || !link.href || link.hasAttribute('download')) return false;
    if (link.target && link.target.toLowerCase() !== '_self') return false;
    var parser = document.createElement('a');
    parser.href = link.href;
    return parser.protocol.indexOf('http') === 0 && parser.origin === window.location.origin;
  }
  function safeFocus(element) {
    if (!element || !document.documentElement.contains(element)) return;
    try { element.focus({ preventScroll: true }); }
    catch (error) { element.focus(); }
  }
  function animationFrame(callback) {
    if (window.requestAnimationFrame) return window.requestAnimationFrame(callback);
    return window.setTimeout(callback, 16);
  }
  // Reading progress has two possible scroll roots: the window on a normal
  // detail navigation, and the isolated panel scroller after enhancement.
  function wireReadingProgress(root, scrollSource) {
    var bar = root.querySelector ? root.querySelector(PROGRESS_SELECTOR) : null;
    if (!bar) return function () {};
    var track = bar.parentNode;
    var framePending = false;
    function update() {
      framePending = false;
      var top;
      var maximum;
      if (scrollSource === window) {
        var html = document.documentElement;
        var body = document.body;
        var height = Math.max(html.scrollHeight, html.offsetHeight,
          body ? body.scrollHeight : 0, body ? body.offsetHeight : 0);
        top = window.pageYOffset || html.scrollTop || 0;
        maximum = Math.max(0, height - window.innerHeight);
      } else {
        top = scrollSource.scrollTop;
        maximum = Math.max(0, scrollSource.scrollHeight - scrollSource.clientHeight);
      }
      var ratio = maximum ? clamp(top / maximum, 0, 1) : 0;
      var percentage = Math.round(ratio * 10000) / 100;
      bar.style.height = percentage + '%';
      bar.style.setProperty('--cabinet-reading-progress', String(ratio));
      if (track && track.setAttribute) track.setAttribute('aria-valuenow', String(Math.round(percentage)));
    }
    function schedule() {
      if (framePending) return;
      framePending = true; animationFrame(update);
    }
    scrollSource.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    schedule();
    return function () {
      scrollSource.removeEventListener('scroll', schedule); window.removeEventListener('resize', schedule);
      if (scrollSource !== window) bar.style.height = '0%';
    };
  }
  // Pinning the body is deliberate. Merely hiding overflow still lets iOS
  // Safari's page drift underneath a modal, then exposes the drift at close.
  function rememberStyles(element, properties) {
    return properties.map(function (property) {
      return { property: property, value: element.style.getPropertyValue(property),
        priority: element.style.getPropertyPriority(property) };
    });
  }
  function restoreStyles(element, remembered) {
    remembered.forEach(function (entry) {
      if (entry.value) element.style.setProperty(entry.property, entry.value, entry.priority);
      else element.style.removeProperty(entry.property);
    });
  }
  function lockPageScroll() {
    if (scrollLock) return;
    var html = document.documentElement, body = document.body;
    var y = Math.round(window.pageYOffset || html.scrollTop || 0);
    scrollLock = {
      y: y,
      hadClass: html.classList.contains('cabinet-lock-scroll'),
      htmlStyles: rememberStyles(html, ['overflow', 'overscroll-behavior', 'scroll-behavior']),
      bodyStyles: rememberStyles(body, [
        'position', 'top', 'left', 'right', 'width', 'overflow',
        'overscroll-behavior', 'touch-action'
      ])
    };
    html.classList.add('cabinet-lock-scroll');
    html.style.setProperty('overflow', 'hidden');
    html.style.setProperty('overscroll-behavior', 'none');
    body.style.setProperty('position', 'fixed');
    body.style.setProperty('top', (-y) + 'px');
    body.style.setProperty('left', '0');
    body.style.setProperty('right', '0');
    body.style.setProperty('width', html.clientWidth + 'px');
    body.style.setProperty('overflow', 'hidden');
    body.style.setProperty('overscroll-behavior', 'none');
  }
  function restoreScrollPosition(y) {
    var html = document.documentElement;
    var oldValue = html.style.getPropertyValue('scroll-behavior'),
      oldPriority = html.style.getPropertyPriority('scroll-behavior');
    html.style.setProperty('scroll-behavior', 'auto', 'important');
    window.scrollTo(0, y);
    if (oldValue) html.style.setProperty('scroll-behavior', oldValue, oldPriority);
    else html.style.removeProperty('scroll-behavior');
  }
  function unlockPageScroll() {
    if (!scrollLock) return;
    var lock = scrollLock;
    scrollLock = null;
    var html = document.documentElement;
    restoreStyles(document.body, lock.bodyStyles);
    restoreStyles(html, lock.htmlStyles);
    if (!lock.hadClass) html.classList.remove('cabinet-lock-scroll');
    restoreScrollPosition(lock.y);
    // Mobile browser chrome can resize the visual viewport just after the
    // fixed body is released. Reassert the rounded position on that settle.
    if (window.visualViewport) {
      var resettle = function () {
        restoreScrollPosition(lock.y);
        window.visualViewport.removeEventListener('resize', resettle);
      };
      window.visualViewport.addEventListener('resize', resettle);
      window.setTimeout(function () { window.visualViewport.removeEventListener('resize', resettle); }, 850);
    }
  }
  // Inert and aria-hidden are both recorded, rather than blindly removed,
  // because a host page may already be managing either state itself.
  function makeUnderlyingPageInert() {
    var candidates = document.querySelectorAll('header, main#main-content, footer');
    var records = [];
    for (var i = 0; i < candidates.length; i++) {
      var element = candidates[i];
      var coveredByParent = false;
      for (var j = 0; j < records.length; j++) {
        if (records[j].element.contains(element)) coveredByParent = true;
      }
      if (coveredByParent) continue;
      records.push({ element: element, hadInert: element.hasAttribute('inert'),
        hadAriaHidden: element.hasAttribute('aria-hidden'),
        ariaHidden: element.getAttribute('aria-hidden') });
      element.setAttribute('inert', '');
      element.setAttribute('aria-hidden', 'true');
      try { element.inert = true; } catch (error) {}
    }
    return records;
  }
  function restoreUnderlyingPage(records) {
    records.forEach(function (record) {
      if (!record.hadInert) record.element.removeAttribute('inert');
      try { record.element.inert = record.hadInert; } catch (error) {}
      if (record.hadAriaHidden) record.element.setAttribute('aria-hidden', record.ariaHidden);
      else record.element.removeAttribute('aria-hidden');
    });
  }
  function applyFrame(element, frame) {
    Object.keys(frame).forEach(function (property) {
      if (property !== 'offset') element.style[property] = frame[property];
    });
  }
  // WAAPI gives the best clip-path interpolation. The transition fallback is
  // intentionally simple and still ends in the exact same DOM and focus state.
  function play(element, frames, options, complete) {
    var duration = options.duration || 0, delayMs = options.delay || 0;
    var easing = options.easing || 'ease';
    var last = frames[frames.length - 1];
    var ended = false, animation = null, startTimer = null, finishTimer = null;
    var oldTransition = element.style.transition;
    function finish() {
      if (ended) return;
      ended = true;
      applyFrame(element, last);
      if (animation) try { animation.cancel(); } catch (error) {}
      element.style.transition = oldTransition;
      if (complete) complete();
    }
    if (element.animate) {
      animation = element.animate(frames, {
        duration: duration, delay: delayMs, easing: easing, fill: 'both'
      });
      animation.onfinish = finish;
    } else {
      applyFrame(element, frames[0]);
      void element.offsetWidth;
      startTimer = window.setTimeout(function () {
        if (ended) return;
        element.style.transition = 'all ' + duration + 'ms ' + easing;
        applyFrame(element, last);
      }, delayMs + 16);
      finishTimer = window.setTimeout(finish, delayMs + duration + 40);
    }
    return {
      cancel: function () {
        if (ended) return;
        ended = true;
        if (startTimer) window.clearTimeout(startTimer);
        if (finishTimer) window.clearTimeout(finishTimer);
        if (animation) try { animation.cancel(); } catch (error) {}
        element.style.transition = oldTransition;
      }
    };
  }
  function trackAnimation(owner, handle) {
    if (handle) owner.animations.push(handle);
    return handle;
  }
  function freezeAndCancelAnimations(owner) {
    var panelStyle = window.getComputedStyle(owner.panel);
    var scrollStyle = window.getComputedStyle(owner.scroller);
    var backdropStyle = window.getComputedStyle(owner.backdrop);
    var frozen = {
      clipPath: panelStyle.clipPath,
      panelOpacity: panelStyle.opacity,
      scrollOpacity: scrollStyle.opacity,
      backdropOpacity: backdropStyle.opacity
    };
    owner.animations.forEach(function (handle) { handle.cancel(); });
    owner.animations = [];
    owner.panel.style.clipPath = frozen.clipPath;
    owner.panel.style.opacity = frozen.panelOpacity;
    owner.scroller.style.opacity = frozen.scrollOpacity;
    owner.backdrop.style.opacity = frozen.backdropOpacity;
  }
  function visibleRect(rect) {
    var left = clamp(rect.left, 0, window.innerWidth);
    var top = clamp(rect.top, 0, window.innerHeight);
    var right = clamp(rect.right, left + 1, window.innerWidth);
    var bottom = clamp(rect.bottom, top + 1, window.innerHeight);
    return { left: left, top: top, right: right, bottom: bottom };
  }
  function clipForRect(rect, radius) {
    var box = visibleRect(rect);
    var top = box.top;
    var right = Math.max(0, window.innerWidth - box.right);
    var bottom = Math.max(0, window.innerHeight - box.bottom);
    var left = box.left;
    return 'inset(' + top.toFixed(2) + 'px ' + right.toFixed(2) + 'px ' +
      bottom.toFixed(2) + 'px ' + left.toFixed(2) + 'px round ' +
      Math.max(0, radius).toFixed(2) + 'px)';
  }
  function fullClip() {
    return 'inset(0px 0px 0px 0px round 0px)';
  }
  function supportsClipPath() {
    if (!window.CSS || !window.CSS.supports) return 'clipPath' in document.body.style;
    return window.CSS.supports('clip-path', 'inset(1px round 1px)');
  }
  function findShared(root, matchingElement) {
    if (!root) return null;
    var key = matchingElement ? matchingElement.getAttribute('data-cabinet-shared') : null;
    var candidates = [];
    if (root.nodeType === 1 && root.hasAttribute('data-cabinet-shared')) candidates.push(root);
    var descendants = root.querySelectorAll ? root.querySelectorAll(SHARED_SELECTOR) : [];
    for (var i = 0; i < descendants.length; i++) candidates.push(descendants[i]);
    if (!candidates.length) return null;
    if (key === null || key === '') return candidates[0];
    for (var j = 0; j < candidates.length; j++) {
      if (candidates[j].getAttribute('data-cabinet-shared') === key) return candidates[j];
    }
    return null;
  }
  function stripCloneIds(clone) {
    if (clone.removeAttribute) clone.removeAttribute('id');
    var identified = clone.querySelectorAll ? clone.querySelectorAll('[id]') : [];
    for (var i = 0; i < identified.length; i++) identified[i].removeAttribute('id');
  }
  // Only pixels fly. The panel's live text remains at its final size and
  // reflows normally underneath this fixed shared-image clone.
  function flySharedElement(fromElement, toElement, duration) {
    if (!fromElement || !toElement) return null;
    var from = fromElement.getBoundingClientRect();
    var to = toElement.getBoundingClientRect();
    if (!from.width || !from.height || !to.width || !to.height) return null;
    var clone = fromElement.cloneNode(true);
    stripCloneIds(clone);
    clone.classList.add('cabinet-shared-clone');
    clone.setAttribute('aria-hidden', 'true');
    if (clone.tagName === 'IMG' && fromElement.currentSrc) clone.src = fromElement.currentSrc;
    var fromStyle = window.getComputedStyle(fromElement);
    var toStyle = window.getComputedStyle(toElement);
    var oldFromVisibility = fromElement.style.visibility;
    var oldToVisibility = toElement.style.visibility;
    fromElement.style.visibility = 'hidden';
    toElement.style.visibility = 'hidden';
    clone.style.position = 'fixed';
    clone.style.pointerEvents = 'none';
    clone.style.left = from.left + 'px';
    clone.style.top = from.top + 'px';
    clone.style.width = from.width + 'px';
    clone.style.height = from.height + 'px';
    clone.style.margin = '0';
    clone.style.objectFit = fromStyle.objectFit;
    clone.style.objectPosition = fromStyle.objectPosition;
    clone.style.borderRadius = fromStyle.borderRadius;
    clone.style.boxSizing = 'border-box';
    document.body.appendChild(clone);
    var finished = false;
    var motion = play(clone, [
      {
        left: from.left + 'px', top: from.top + 'px',
        width: from.width + 'px', height: from.height + 'px',
        borderRadius: fromStyle.borderRadius
      },
      {
        left: to.left + 'px', top: to.top + 'px',
        width: to.width + 'px', height: to.height + 'px',
        borderRadius: toStyle.borderRadius
      }
    ], {
      duration: duration,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
    }, cleanup);
    function cleanup() {
      if (finished) return;
      finished = true;
      if (clone.parentNode) clone.parentNode.removeChild(clone);
      fromElement.style.visibility = oldFromVisibility;
      toElement.style.visibility = oldToVisibility;
    }
    return {
      cancel: function () {
        motion.cancel();
        cleanup();
      }
    };
  }
  function copyMainIntoScroller(fetchedMain) {
    var scroller = document.createElement('div');
    scroller.className = 'cabinet-panel-scroll';
    if (typeof fetchedMain.className === 'string' && fetchedMain.className) {
      scroller.className += ' ' + fetchedMain.className;
    }
    for (var i = 0; i < fetchedMain.attributes.length; i++) {
      var attribute = fetchedMain.attributes[i];
      if (attribute.name.indexOf('data-') === 0) {
        scroller.setAttribute(attribute.name, attribute.value);
      }
    }
    scroller.setAttribute('tabindex', '-1');
    scroller.style.height = '100%';
    scroller.style.overflowY = 'auto';
    scroller.style.overscrollBehavior = 'contain';
    scroller.style.webkitOverflowScrolling = 'touch';
    while (fetchedMain.firstChild) scroller.appendChild(fetchedMain.firstChild);
    return scroller;
  }
  function installFocusTrap(owner) {
    owner.keyHandler = function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeOverlay({});
        return;
      }
      if (event.key !== 'Tab') return;
      var selector = 'a[href], button:not([disabled]), input:not([disabled]), ' +
        'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
      var all = owner.panel.querySelectorAll(selector);
      var focusable = [];
      for (var i = 0; i < all.length; i++) {
        if (all[i].getAttribute('aria-hidden') === 'true') continue;
        if (all[i].getClientRects().length) focusable.push(all[i]);
      }
      if (!focusable.length) {
        event.preventDefault();
        safeFocus(owner.panel);
        return;
      }
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !owner.panel.contains(document.activeElement))) {
        event.preventDefault();
        safeFocus(last);
      } else if (!event.shiftKey && (document.activeElement === last || !owner.panel.contains(document.activeElement))) {
        event.preventDefault();
        safeFocus(first);
      }
    };
    document.addEventListener('keydown', owner.keyHandler, true);
  }
  function prepareHeading(owner) {
    var heading = owner.scroller.querySelector('h1');
    if (!heading) {
      owner.panel.setAttribute('aria-label', document.title || 'Detail');
      return owner.panel;
    }
    if (!heading.id) heading.id = 'cabinet-panel-heading-' + owner.id;
    heading.setAttribute('tabindex', '-1');
    owner.panel.setAttribute('aria-labelledby', heading.id);
    return heading;
  }
  function hardNavigate(request) {
    if (current !== request) return;
    current = null;
    request.item.classList.remove('cabinet-item--opening');
    if (request.controller) request.controller.abort();
    window.location.assign(request.href);
  }
  function openCard(link) {
    var item = itemForLink(link);
    var request = {
      id: ++sequence,
      phase: 'loading',
      link: link,
      item: item,
      visualCard: artifactForLink(link, item),
      href: link.href,
      originalTitle: document.title,
      controller: window.AbortController ? new AbortController() : null
    };
    current = request;
    request.item.classList.add('cabinet-item--opening');
    var options = { credentials: 'same-origin' };
    if (request.controller) options.signal = request.controller.signal;
    var responseWork = window.fetch(request.href, options).then(function (response) {
      if (!response.ok) throw new Error('Cabinet detail request failed');
      return response.text();
    });
    Promise.all([responseWork, delay(ACKNOWLEDGE_MS)])
      .then(function (results) {
        if (current !== request) return;
        showOverlay(request, results[0]);
      })
      .catch(function (error) {
        if (error && error.name === 'AbortError') return;
        hardNavigate(request);
      });
  }
  function showOverlay(request, html) {
    var parsed = new DOMParser().parseFromString(html, 'text/html');
    var fetchedMain = parsed.querySelector('main#main-content');
    if (!fetchedMain) {
      hardNavigate(request);
      return;
    }
    var sourceRect = request.visualCard.getBoundingClientRect();
    var sourceRadius = parseFloat(window.getComputedStyle(request.visualCard).borderRadius) || 0;
    var sourceShared = findShared(request.visualCard, null);
    var scroller = copyMainIntoScroller(fetchedMain);
    var backdrop = document.createElement('div');
    var panel = document.createElement('div');
    backdrop.className = 'cabinet-backdrop';
    panel.className = 'cabinet-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('tabindex', '-1');
    var cabinetType = request.link.getAttribute('data-cabinet-type') || request.item.getAttribute('data-cabinet-type');
    if (cabinetType) panel.setAttribute('data-cabinet-type', cabinetType);
    backdrop.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;opacity:0';
    panel.style.cssText = 'position:fixed;top:0;right:0;bottom:0;left:0;overflow:hidden';
    panel.appendChild(scroller);
    lockPageScroll();
    var inertRecords = makeUnderlyingPageInert();
    document.body.appendChild(backdrop);
    document.body.appendChild(panel);
    request.item.classList.remove('cabinet-item--opening');
    var owner = request;
    owner.phase = 'open';
    owner.panel = panel;
    owner.backdrop = backdrop;
    owner.scroller = scroller;
    owner.inertRecords = inertRecords;
    owner.sourceRect = sourceRect;
    owner.sourceRadius = sourceRadius;
    owner.sourceShared = sourceShared;
    owner.animations = [];
    owner.progressCleanup = wireReadingProgress(document, scroller);
    owner.heading = prepareHeading(owner);
    owner.closing = false;
    try {
      window.history.pushState({ cabinetOverlay: true }, '', request.href);
      owner.historyPushed = true;
    } catch (error) {
      owner.historyPushed = false;
      hardNavigate(owner);
      return;
    }
    document.title = parsed.title || request.originalTitle;
    installFocusTrap(owner);
    var closeLink = scroller.querySelector('.cabinet-close');
    if (closeLink) {
      closeLink.addEventListener('click', function (event) {
        if (!isUnmodifiedLeftClick(event)) return;
        event.preventDefault();
        closeOverlay({});
      });
    }
    var canClip = supportsClipPath();
    var startClip = clipForRect(sourceRect, sourceRadius);
    panel.style.clipPath = canClip ? startClip : fullClip();
    scroller.style.opacity = '0';
    var openDuration = reduceMotion ? 120 : OPEN_MS;
    animationFrame(function () {
      if (current !== owner || owner.closing) return;
      var targetShared = findShared(scroller, sourceShared);
      owner.targetShared = targetShared;
      trackAnimation(owner, play(backdrop, [
        { opacity: '0' }, { opacity: '1' }
      ], {
        duration: reduceMotion ? 100 : 320,
        easing: 'ease-out'
      }));
      trackAnimation(owner, play(panel, canClip && !reduceMotion ? [
        { clipPath: startClip, opacity: '1' },
        { clipPath: fullClip(), opacity: '1' }
      ] : [
        { clipPath: fullClip(), opacity: '0' },
        { clipPath: fullClip(), opacity: '1' }
      ], {
        duration: openDuration,
        easing: 'cubic-bezier(0.22, 1, 0.36, 1)'
      }, function () {
        panel.style.clipPath = 'none';
      }));
      trackAnimation(owner, play(scroller, reduceMotion ? [
        { opacity: '0' }, { opacity: '1' }
      ] : [
        { opacity: '0', offset: 0 },
        { opacity: '0.08', offset: 0.18 },
        { opacity: '1', offset: 1 }
      ], {
        duration: reduceMotion ? 100 : 440,
        delay: reduceMotion ? 0 : 70,
        easing: 'ease-out'
      }));
      if (sourceShared && targetShared && !reduceMotion) {
        trackAnimation(owner, flySharedElement(sourceShared, targetShared, OPEN_MS));
      }
    });
    owner.focusTimer = window.setTimeout(function () {
      if (current === owner && !owner.closing) safeFocus(owner.heading);
    }, 0);
  }
  function closeOverlay(options) {
    var owner = current;
    if (!owner || owner.phase !== 'open' || owner.closing) return;
    owner.closing = true;
    current = null;
    document.removeEventListener('keydown', owner.keyHandler, true);
    if (owner.focusTimer) window.clearTimeout(owner.focusTimer);
    if (owner.controller) owner.controller.abort();
    if (owner.progressCleanup) owner.progressCleanup();
    document.title = owner.originalTitle;
    var currentClip = window.getComputedStyle(owner.panel).clipPath;
    freezeAndCancelAnimations(owner);
    var destinationRect = owner.visualCard.getBoundingClientRect();
    if (!destinationRect.width || !destinationRect.height) destinationRect = owner.sourceRect;
    var destinationRadius = parseFloat(window.getComputedStyle(owner.visualCard).borderRadius);
    if (isNaN(destinationRadius)) destinationRadius = owner.sourceRadius;
    var destinationClip = clipForRect(destinationRect, destinationRadius);
    var closeDuration = reduceMotion ? 100 : CLOSE_MS;
    var closeHandles = [];
    closeHandles.push(play(owner.backdrop, [
      { opacity: owner.backdrop.style.opacity || '1' }, { opacity: '0' }
    ], {
      duration: reduceMotion ? 90 : 300,
      easing: 'ease-in'
    }));
    closeHandles.push(play(owner.scroller, [
      { opacity: owner.scroller.style.opacity || '1' }, { opacity: '0' }
    ], {
      duration: reduceMotion ? 80 : 220,
      easing: 'ease-in'
    }));
    closeHandles.push(play(owner.panel, reduceMotion ? [
      { clipPath: fullClip(), opacity: owner.panel.style.opacity || '1' },
      { clipPath: fullClip(), opacity: '0' }
    ] : [
      { clipPath: currentClip === 'none' ? fullClip() : currentClip, opacity: '1' },
      { clipPath: destinationClip, opacity: '1' }
    ], {
      duration: closeDuration,
      easing: 'cubic-bezier(0.32, 0, 0.67, 0)'
    }));
    var sourceShared = owner.sourceShared && document.documentElement.contains(owner.sourceShared) ?
      owner.sourceShared : findShared(owner.visualCard, null);
    var targetShared = findShared(owner.scroller, sourceShared);
    if (sourceShared && targetShared && !reduceMotion) {
      var sharedClose = flySharedElement(targetShared, sourceShared, CLOSE_MS);
      if (sharedClose) closeHandles.push(sharedClose);
    }
    if (!options.skipHistory && owner.historyPushed) window.history.back();
    window.setTimeout(function () {
      closeHandles.forEach(function (handle) { handle.cancel(); });
      if (owner.panel.parentNode) owner.panel.parentNode.removeChild(owner.panel);
      if (owner.backdrop.parentNode) owner.backdrop.parentNode.removeChild(owner.backdrop);
      restoreUnderlyingPage(owner.inertRecords);
      unlockPageScroll();
      owner.item.classList.remove('cabinet-item--opening');
      safeFocus(owner.link);
    }, closeDuration + 50);
  }
  // Direct detail pages use their own document scroll and retain ordinary
  // close-link navigation. They never install the feed interception below.
  if (isDirectDetailPage()) {
    wireReadingProgress(document, window);
    return;
  }
  if (!window.fetch || !window.Promise || !window.DOMParser ||
      !window.history || !window.history.pushState) return;
  if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual';
  document.addEventListener('click', function (event) {
    if (current || !isUnmodifiedLeftClick(event)) return;
    var link = closestCard(event.target);
    if (!link || !sameOriginNavigableLink(link)) return;
    event.preventDefault();
    openCard(link);
  });
  window.addEventListener('popstate', function (event) {
    if (current && current.phase === 'open') closeOverlay({ skipHistory: true });
    else if (event.state && event.state.cabinetOverlay) window.location.assign(window.location.href);
  });
})();
`;
