// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initConsentManagement();
    initHeroAnimation();
    initScrollReveal();
    initFormHandling();
    initAIAssistant();
    initSmoothScroll();
    initEmailDemo();
    initFAQAccordion();
    initFooterYear();
});

const CONSENT_STORAGE_KEY = 'fr_cookie_consent_v1';
const CONSENT_ID_STORAGE_KEY = 'fr_cookie_consent_id';
const CONSENT_VERSION = '2026-02-16';
const CONSENT_MAX_AGE_DAYS = 180;
const CONSENT_LOG_TIMEOUT_MS = 2500;
const CONSENT_DEFAULT = {
    necessary: true,
    analytics: false,
    marketing: false
};

let analyticsInitialized = false;
let marketingInitialized = false;
let analyticsPageViewTracked = false;
let marketingPageViewTracked = false;

function initConsentManagement() {
    if (document.body.dataset.cookieUiReady === 'true') return;
    document.body.dataset.cookieUiReady = 'true';
    initConsentModeDefaults();

    injectConsentMarkup();
    bindConsentEvents();

    const savedConsent = readStoredConsent();
    if (!savedConsent) {
        applyConsent(CONSENT_DEFAULT);
        openConsentBanner();
        return;
    }

    applyConsent(savedConsent.preferences);
}

function readStoredConsent() {
    try {
        const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || !parsed.preferences) return null;
        if (parsed.version !== CONSENT_VERSION || isConsentExpired(parsed)) {
            localStorage.removeItem(CONSENT_STORAGE_KEY);
            return null;
        }
        return parsed;
    } catch (_error) {
        return null;
    }
}

function isConsentExpired(consentPayload) {
    const now = Date.now();
    const expiresAtMs = Date.parse(consentPayload?.expiresAt || '');
    if (Number.isFinite(expiresAtMs)) {
        return now > expiresAtMs;
    }

    const updatedAtMs = Date.parse(consentPayload?.updatedAt || '');
    if (!Number.isFinite(updatedAtMs)) return true;

    return (now - updatedAtMs) > (CONSENT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
}

function getConsentIdentifier() {
    const fallback = `consent_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    try {
        const existingId = localStorage.getItem(CONSENT_ID_STORAGE_KEY);
        if (existingId) return existingId;

        const generatedId = window.crypto?.randomUUID ? window.crypto.randomUUID() : fallback;
        localStorage.setItem(CONSENT_ID_STORAGE_KEY, generatedId);
        return generatedId;
    } catch (_error) {
        return fallback;
    }
}

function persistConsent(preferences, source = 'unknown') {
    const updatedAt = new Date();
    const expiresAt = new Date(updatedAt.getTime() + (CONSENT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000));
    const consentId = getConsentIdentifier();
    const payload = {
        id: consentId,
        version: CONSENT_VERSION,
        updatedAt: updatedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        source,
        preferences: {
            necessary: true,
            analytics: Boolean(preferences.analytics),
            marketing: Boolean(preferences.marketing)
        }
    };

    try {
        localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(payload));
    } catch (_error) {
        // Ignore storage failures, consent still applies for current session.
    }

    void logConsentEvidence(payload);
    return payload;
}

function applyConsent(preferences) {
    const normalized = {
        necessary: true,
        analytics: Boolean(preferences.analytics),
        marketing: Boolean(preferences.marketing)
    };

    if (normalized.analytics) {
        enableAnalyticsTracking();
    } else {
        disableAnalyticsTracking();
    }

    if (normalized.marketing) {
        enableMarketingTracking();
    } else {
        disableMarketingTracking();
    }
}

function getTrackingConfig() {
    const userConfig = window.FR_TRACKING_CONFIG || {};
    return {
        ga4MeasurementId: String(userConfig.ga4MeasurementId || '').trim(),
        googleAdsId: String(userConfig.googleAdsId || '').trim(),
        metaPixelId: String(userConfig.metaPixelId || '').trim(),
        consentLogEndpoint: String(userConfig.consentLogEndpoint || '').trim(),
        policyVersion: String(userConfig.policyVersion || CONSENT_VERSION).trim()
    };
}

function ensureDataLayerStub() {
    if (!window.dataLayer) {
        window.dataLayer = [];
    }

    if (!window.gtag) {
        window.gtag = function gtag() {
            window.dataLayer.push(arguments);
        };
    }
}

function initConsentModeDefaults() {
    ensureDataLayerStub();
    window.gtag('consent', 'default', {
        analytics_storage: 'denied',
        ad_storage: 'denied',
        ad_user_data: 'denied',
        ad_personalization: 'denied',
        wait_for_update: 500
    });
}

function ensureGtagBase(tagIds = []) {
    const validTagIds = tagIds.filter(Boolean);
    if (validTagIds.length === 0) return;

    ensureDataLayerStub();

    if (!document.querySelector('script[data-cookie-managed="gtag"]')) {
        const bootstrapId = validTagIds[0];
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(bootstrapId)}`;
        script.dataset.cookieManaged = 'gtag';
        document.head.appendChild(script);
        window.gtag('js', new Date());
    }

    validTagIds.forEach((id) => {
        window.gtag('config', id, {
            anonymize_ip: true,
            allow_google_signals: false,
            send_page_view: false
        });
    });
}

function enableAnalyticsTracking() {
    const config = getTrackingConfig();
    if (!config.ga4MeasurementId) return;

    if (!analyticsInitialized) {
        ensureGtagBase([config.ga4MeasurementId]);
        analyticsInitialized = true;
    }

    window.gtag('consent', 'update', {
        analytics_storage: 'granted'
    });

    if (!analyticsPageViewTracked) {
        window.gtag('event', 'page_view', {
            page_path: window.location.pathname,
            page_location: window.location.href,
            page_title: document.title
        });
        analyticsPageViewTracked = true;
    }
}

function enableMarketingTracking() {
    const config = getTrackingConfig();
    const gtagTargets = [];
    if (config.ga4MeasurementId) gtagTargets.push(config.ga4MeasurementId);
    if (config.googleAdsId) gtagTargets.push(config.googleAdsId);

    if (gtagTargets.length > 0) {
        ensureGtagBase(gtagTargets);
    }

    if (window.gtag) {
        window.gtag('consent', 'update', {
            ad_storage: 'granted',
            ad_user_data: 'granted',
            ad_personalization: 'granted'
        });
    }

    if (config.metaPixelId && !window.fbq) {
        // Meta pixel is loaded only after explicit marketing consent.
        (function (f, b, e, v, n, t, s) {
            if (f.fbq) return;
            n = f.fbq = function () {
                n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
            };
            if (!f._fbq) f._fbq = n;
            n.push = n;
            n.loaded = true;
            n.version = '2.0';
            n.queue = [];
            t = b.createElement(e);
            t.async = true;
            t.src = v;
            s = b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t, s);
        })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

        window.fbq('init', config.metaPixelId);
    }

    if (window.fbq && config.metaPixelId) {
        window.fbq('consent', 'grant');
        if (!marketingPageViewTracked) {
            window.fbq('track', 'PageView');
            marketingPageViewTracked = true;
        }
    }

    marketingInitialized = gtagTargets.length > 0 || Boolean(config.metaPixelId);
}

function disableAnalyticsTracking() {
    if (window.gtag) {
        window.gtag('consent', 'update', {
            analytics_storage: 'denied'
        });
    }

    deleteKnownCookiesByPrefix(['_ga', '_gid', '_gat', '_gac_']);
}

function disableMarketingTracking() {
    if (window.gtag) {
        window.gtag('consent', 'update', {
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied'
        });
    }

    if (window.fbq) {
        window.fbq('consent', 'revoke');
    }

    deleteKnownCookiesByPrefix(['_fbp', '_fbc', '_gcl_', 'IDE', 'test_cookie']);
}

function getDomainCandidates(hostname) {
    const candidates = new Set([hostname, `.${hostname}`]);
    const parts = hostname.split('.').filter(Boolean);

    for (let i = 1; i < parts.length - 1; i++) {
        const rootDomain = parts.slice(i).join('.');
        candidates.add(rootDomain);
        candidates.add(`.${rootDomain}`);
    }

    return Array.from(candidates);
}

function getPathCandidates(pathname) {
    const candidates = new Set(['/']);
    const segments = pathname.split('/').filter(Boolean);
    let currentPath = '';
    segments.forEach((segment) => {
        currentPath += `/${segment}`;
        candidates.add(currentPath);
    });
    return Array.from(candidates);
}

function expireCookie(name, path, domain, secure = false) {
    const attributes = [
        `${name}=`,
        'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
        'Max-Age=0',
        `Path=${path}`,
        'SameSite=Lax'
    ];

    if (domain) {
        attributes.push(`Domain=${domain}`);
    }

    if (secure) {
        attributes.push('Secure');
    }

    document.cookie = attributes.join('; ');
}

function deleteKnownCookiesByPrefix(prefixes = []) {
    if (!document.cookie) return;

    const cookieNames = document.cookie
        .split(';')
        .map((item) => item.trim().split('=')[0])
        .filter(Boolean);

    const targetNames = cookieNames.filter((cookieName) => {
        return prefixes.some((prefix) => cookieName === prefix || cookieName.startsWith(prefix));
    });

    if (!targetNames.length) return;

    const domains = getDomainCandidates(window.location.hostname);
    const paths = getPathCandidates(window.location.pathname);
    const useSecure = window.location.protocol === 'https:';

    targetNames.forEach((cookieName) => {
        paths.forEach((path) => {
            expireCookie(cookieName, path, '', false);
            expireCookie(cookieName, path, '', useSecure);

            domains.forEach((domain) => {
                expireCookie(cookieName, path, domain, false);
                expireCookie(cookieName, path, domain, useSecure);
            });
        });
    });
}

async function logConsentEvidence(consentPayload) {
    const config = getTrackingConfig();
    if (!config.consentLogEndpoint) return;

    const payload = {
        consent_id: consentPayload.id,
        consent_version: consentPayload.version,
        policy_version: config.policyVersion,
        source: consentPayload.source,
        updated_at: consentPayload.updatedAt,
        expires_at: consentPayload.expiresAt,
        preferences: consentPayload.preferences,
        page_url: window.location.href,
        page_path: window.location.pathname,
        referrer: document.referrer || '',
        user_agent: navigator.userAgent
    };

    const body = JSON.stringify(payload);
    let timeoutId = null;

    try {
        if (navigator.sendBeacon) {
            const blob = new Blob([body], { type: 'application/json' });
            navigator.sendBeacon(config.consentLogEndpoint, blob);
            return;
        }

        const controller = new AbortController();
        timeoutId = window.setTimeout(() => controller.abort(), CONSENT_LOG_TIMEOUT_MS);
        await fetch(config.consentLogEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body,
            keepalive: true,
            signal: controller.signal
        });
    } catch (_error) {
        // Avoid blocking UX for consent logging failures.
    } finally {
        if (timeoutId) {
            window.clearTimeout(timeoutId);
        }
    }
}

function trackCustomEvent(eventName, params = {}) {
    const consent = readStoredConsent();
    if (!consent) return;
    const { analytics, marketing } = consent.preferences;

    if (analytics && window.gtag) {
        window.gtag('event', eventName, params);
    }

    if (marketing && window.fbq) {
        window.fbq('trackCustom', eventName, params);
    }
}

function injectConsentMarkup() {
    if (document.getElementById('cookie-consent-root')) return;

    const root = document.createElement('div');
    root.id = 'cookie-consent-root';
    root.innerHTML = `
        <div class="cookie-consent-banner" id="cookie-consent-banner" role="dialog" aria-modal="true" aria-labelledby="cookie-banner-title" aria-describedby="cookie-banner-desc">
            <div class="cookie-consent-content">
                <button type="button" class="cookie-close" data-consent-action="dismiss" aria-label="Chiudi banner cookie">×</button>
                <h3 id="cookie-banner-title">Cookie e tracciamenti</h3>
                <p id="cookie-banner-desc">
                    Usiamo cookie tecnici sempre attivi. Con il tuo consenso attiviamo analytics e marketing per misurare visite, conversioni e campagne.
                    <a href="cookie-policy.html">Leggi la Cookie Policy</a>.
                </p>
                <div class="cookie-consent-actions">
                    <button type="button" class="cookie-btn cookie-btn-ghost" data-consent-action="deny">Rifiuta non necessari</button>
                    <button type="button" class="cookie-btn cookie-btn-secondary" data-consent-action="customize">Personalizza</button>
                    <button type="button" class="cookie-btn cookie-btn-primary" data-consent-action="accept">Accetta tutto</button>
                </div>
            </div>
        </div>
        <div class="cookie-consent-modal" id="cookie-preferences-modal" role="dialog" aria-modal="true" aria-labelledby="cookie-modal-title" hidden>
            <div class="cookie-modal-panel">
                <h3 id="cookie-modal-title">Preferenze cookie</h3>
                <p>Scegli quali categorie attivare. I cookie tecnici sono necessari al funzionamento del sito.</p>
                <label class="cookie-pref-row cookie-pref-row-locked">
                    <span>Cookie tecnici</span>
                    <input type="checkbox" checked disabled>
                </label>
                <label class="cookie-pref-row">
                    <span>Analytics (misurazione traffico)</span>
                    <input type="checkbox" id="cookie-pref-analytics">
                </label>
                <label class="cookie-pref-row">
                    <span>Marketing (remarketing e ads)</span>
                    <input type="checkbox" id="cookie-pref-marketing">
                </label>
                <div class="cookie-consent-actions">
                    <button type="button" class="cookie-btn cookie-btn-ghost" data-consent-action="save-selected">Salva preferenze</button>
                    <button type="button" class="cookie-btn cookie-btn-primary" data-consent-action="accept">Accetta tutto</button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(root);
}

function openConsentBanner() {
    const banner = document.getElementById('cookie-consent-banner');
    if (!banner) return;
    banner.classList.add('is-visible');
}

function closeConsentBanner() {
    const banner = document.getElementById('cookie-consent-banner');
    if (!banner) return;
    banner.classList.remove('is-visible');
}

function openPreferencesModal() {
    const modal = document.getElementById('cookie-preferences-modal');
    if (!modal) return;

    const consent = readStoredConsent();
    const analyticsInput = document.getElementById('cookie-pref-analytics');
    const marketingInput = document.getElementById('cookie-pref-marketing');

    if (analyticsInput) analyticsInput.checked = Boolean(consent?.preferences?.analytics);
    if (marketingInput) marketingInput.checked = Boolean(consent?.preferences?.marketing);

    modal.hidden = false;
    modal.classList.add('is-visible');
}

function closePreferencesModal() {
    const modal = document.getElementById('cookie-preferences-modal');
    if (!modal) return;
    modal.classList.remove('is-visible');
    modal.hidden = true;
}

function bindConsentEvents() {
    const consentRoot = document.getElementById('cookie-consent-root');
    if (!consentRoot) return;

    consentRoot.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const action = target.dataset.consentAction;
        if (!action) return;

        if (action === 'deny') {
            const consentRecord = persistConsent(CONSENT_DEFAULT, 'banner_reject_all');
            applyConsent(consentRecord.preferences);
            closePreferencesModal();
            closeConsentBanner();
            return;
        }

        if (action === 'dismiss') {
            const consentRecord = persistConsent(CONSENT_DEFAULT, 'banner_close_x');
            applyConsent(consentRecord.preferences);
            closePreferencesModal();
            closeConsentBanner();
            return;
        }

        if (action === 'accept') {
            const consentRecord = persistConsent({
                necessary: true,
                analytics: true,
                marketing: true
            }, 'banner_accept_all');
            applyConsent(consentRecord.preferences);
            closePreferencesModal();
            closeConsentBanner();
            return;
        }

        if (action === 'customize') {
            openPreferencesModal();
            return;
        }

        if (action === 'save-selected') {
            const analyticsInput = document.getElementById('cookie-pref-analytics');
            const marketingInput = document.getElementById('cookie-pref-marketing');
            const consentRecord = persistConsent({
                necessary: true,
                analytics: Boolean(analyticsInput?.checked),
                marketing: Boolean(marketingInput?.checked)
            }, 'banner_save_preferences');
            applyConsent(consentRecord.preferences);
            closePreferencesModal();
            closeConsentBanner();
        }
    });

    const manageButton = document.getElementById('manage-cookie-preferences');
    if (manageButton) {
        manageButton.addEventListener('click', () => {
            openPreferencesModal();
        });
    }

    bindTrackingEvents();
}

function bindTrackingEvents() {
    document.querySelectorAll('a[href="#contatti"]').forEach((link) => {
        link.addEventListener('click', () => {
            trackCustomEvent('contact_cta_click', {
                placement: 'navigation'
            });
        });
    });

    const whatsappLink = document.querySelector('.whatsapp-link');
    if (whatsappLink) {
        whatsappLink.addEventListener('click', () => {
            trackCustomEvent('whatsapp_click', {
                contact_channel: 'whatsapp'
            });
        });
    }

    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', () => {
            trackCustomEvent('contact_form_submit', {
                contact_channel: 'form'
            });
        });
    }
}

// Hero animation - OTTIMIZZATA per performance
function initHeroAnimation() {
    const heroTitle = document.querySelector('.hero-title');
    const heroTagline = document.getElementById('typing-description');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    const heroCta = document.querySelector('.hero-cta');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Verifica che gli elementi esistano per evitare errori
    if (!heroTagline) return;

    const fallbackDescription = (heroTagline.textContent || '').trim();
    const description = fallbackDescription || 'Aiuto attività e professionisti ad alleggerire e rendere più efficiente il loro lavoro.';

    const lockTaglineHeight = () => {
        const measuredHeight = Math.ceil(heroTagline.getBoundingClientRect().height);
        if (measuredHeight > 0) {
            heroTagline.style.minHeight = `${measuredHeight}px`;
        }
    };

    // Evita salti di layout su mobile durante il typewriter.
    lockTaglineHeight();
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
            if (!heroTagline.classList.contains('typing-complete')) {
                lockTaglineHeight();
            }
        }).catch(() => {});
    }

    // Animate title (fade in) - usa CSS animation invece di JS quando possibile
    if (heroTitle) {
        heroTitle.style.opacity = '1';
        heroTitle.style.transform = 'translateY(0)';
    }

    if (prefersReducedMotion) {
        heroTagline.dataset.typewriter = 'complete';
        heroTagline.style.visibility = 'visible';
        heroTagline.textContent = description;
        heroTagline.style.opacity = '1';
        heroTagline.style.transform = 'translateY(0)';

        if (heroSubtitle) heroSubtitle.classList.add('animate');
        if (heroCta) heroCta.classList.add('animate');
        return;
    }

    // Type description - usa requestAnimationFrame per timing preciso
    // Delay iniziale per dare tempo al browser di finire il layout iniziale
    const startDelay = 500;

    requestAnimationFrame(() => {
        setTimeout(() => {
            // Prepara l'elemento per l'animazione
            heroTagline.dataset.typewriter = 'running';
            heroTagline.style.visibility = 'visible';
            heroTagline.style.opacity = '1';
            heroTagline.style.transform = 'translateY(0)';

            // Avvia l'animazione typewriter
            typeTextWithCursor(heroTagline, description, 35);

            // Calcola quando finisce l'animazione (ms per carattere * numero caratteri)
            const animDuration = description.length * 35;

            // Schedule animazioni successive
            if (heroSubtitle) {
                setTimeout(() => {
                    heroSubtitle.classList.add('animate');
                }, animDuration + 200);
            }

            if (heroCta) {
                setTimeout(() => {
                    heroCta.classList.add('animate');
                }, animDuration + 500);
            }
        }, startDelay);
    });
}

// Type text with cursor animation - OTTIMIZZATA per performance
function typeTextWithCursor(element, text, speed) {
    let i = 0;
    const totalChars = text.length;

    // Crea il cursore una sola volta e lo posiziona via CSS (no DOM manipulation)
    const cursor = document.createElement('span');
    cursor.className = 'typing-cursor';
    cursor.textContent = '|';

    // Prepara l'elemento: contenitore per testo + cursore separato
    const textSpan = document.createElement('span');
    textSpan.className = 'typing-text';
    element.textContent = '';
    element.appendChild(textSpan);
    element.appendChild(cursor);

    // Ottimizzazione: usa requestAnimationFrame per timing più preciso
    let lastTime = 0;
    const charDelay = speed; // ms tra caratteri

    function type(currentTime) {
        if (!lastTime) lastTime = currentTime;
        const elapsed = currentTime - lastTime;

        // Aggiungi caratteri in base al tempo trascorso
        const charsToAdd = Math.floor(elapsed / charDelay);

        if (charsToAdd > 0 && i < totalChars) {
            // Batch: aggiungi più caratteri in una sola operazione se necessario
            const newIndex = Math.min(i + charsToAdd, totalChars);
            textSpan.textContent = text.substring(0, newIndex);
            i = newIndex;
            lastTime = currentTime - (elapsed % charDelay);
        }

        if (i < totalChars) {
            requestAnimationFrame(type);
        } else {
            // Animazione completata, aggiungi classe per stato finale
            element.dataset.typewriter = 'complete';
            element.classList.add('typing-complete');
        }
    }

    requestAnimationFrame(type);
}

// Type text animation (simple version without cursor)
function typeText(element, text, speed) {
    let i = 0;
    element.textContent = '';

    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }

    type();
}

// Scroll reveal animations
function initScrollReveal() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -12% 0px',
        threshold: prefersReducedMotion ? 0.02 : 0.12
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = prefersReducedMotion ? 0 : parseInt(entry.target.dataset.delay || '0', 10);
                if (delay > 0) {
                    window.setTimeout(() => {
                        entry.target.classList.add('animate');
                    }, delay);
                } else {
                    requestAnimationFrame(() => {
                        entry.target.classList.add('animate');
                    });
                }
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animatables = document.querySelectorAll('.service-item, .process-step-new, .fade-in, .case-card');
    animatables.forEach(el => observer.observe(el));

    // Timeline animation
    const timeline = document.querySelector('.process-timeline');
    if (timeline) {
        if (prefersReducedMotion) {
            timeline.classList.add('animate');
            return;
        }

        const timelineObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate');
                    timelineObserver.unobserve(entry.target);
                }
            });
        }, {
            root: null,
            rootMargin: '0px 0px -18% 0px',
            threshold: 0.18
        });

        timelineObserver.observe(timeline);
    }
}

// Email Demo - Split Layout Navigation
function initEmailDemo() {
    const demoRoot = document.querySelector('.usecase-demo');
    const stepNavs = document.querySelectorAll('.demo-step-nav');
    const stepPanels = document.querySelectorAll('.demo-step-panel');

    if (!demoRoot || !stepNavs.length || !stepPanels.length) return;

    const isTypingElement = (element) => {
        if (!element) return false;
        const tag = element.tagName;
        return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || element.isContentEditable;
    };

    function activateStep(stepNumber) {
        // Update navigation
        stepNavs.forEach(nav => {
            nav.classList.remove('active');
            if (nav.dataset.step === stepNumber) {
                nav.classList.add('active');
                nav.setAttribute('aria-current', 'step');
                nav.setAttribute('tabindex', '0');
            } else {
                nav.setAttribute('aria-current', 'false');
                nav.setAttribute('tabindex', '-1');
            }
        });

        // Update panel
        stepPanels.forEach(panel => {
            panel.classList.remove('active');
            if (panel.dataset.step === stepNumber) {
                panel.classList.add('active');
                panel.setAttribute('aria-hidden', 'false');
                panel.scrollTop = 0;
            } else {
                panel.setAttribute('aria-hidden', 'true');
            }
        });
    }

    stepNavs.forEach(nav => {
        nav.setAttribute('type', 'button');
        nav.setAttribute('aria-current', 'false');
        nav.setAttribute('tabindex', '-1');
    });

    stepPanels.forEach(panel => {
        panel.setAttribute('aria-hidden', 'true');
    });

    // Click handlers for navigation
    stepNavs.forEach(nav => {
        nav.addEventListener('click', () => {
            activateStep(nav.dataset.step);
        });
    });

    // Optional: keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (isTypingElement(document.activeElement)) return;

        const isDemoHovered = demoRoot.matches(':hover');
        const isDemoFocused = demoRoot.contains(document.activeElement);
        if (!isDemoHovered && !isDemoFocused) return;

        const activeNav = document.querySelector('.demo-step-nav.active');
        if (!activeNav) return;

        const currentStep = parseInt(activeNav.dataset.step);
        const totalSteps = stepNavs.length;

        if ((e.key === 'ArrowDown' || e.key === 'ArrowRight') && currentStep < totalSteps) {
            e.preventDefault();
            activateStep(String(currentStep + 1));
        } else if ((e.key === 'ArrowUp' || e.key === 'ArrowLeft') && currentStep > 1) {
            e.preventDefault();
            activateStep(String(currentStep - 1));
        }
    });

    // Set initial state - always start at step 1
    activateStep('1');
}

// Form handling
function initFormHandling() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const submitBtn = form.querySelector('.btn-submit');
    const btnText = submitBtn.querySelector('.btn-text');
    const endpoint = form.dataset.endpoint?.trim();
    const fallbackMail = form.dataset.mailto?.trim() || 'info@francescorampini.it';

    const setSubmittingState = (isSubmitting, text, color = '') => {
        btnText.textContent = text;
        submitBtn.disabled = isSubmitting;
        submitBtn.style.borderColor = color;
        submitBtn.style.color = color;
    };

    const resetButtonState = () => {
        btnText.textContent = 'Invia';
        submitBtn.disabled = false;
        submitBtn.style.borderColor = '';
        submitBtn.style.color = '';
    };

    const buildMailtoUrl = ({ name, email, message }) => {
        const subject = encodeURIComponent(`Richiesta dal sito - ${name || 'Nuovo contatto'}`);
        const body = encodeURIComponent(
            [
                'Nuovo messaggio dal sito:',
                '',
                `Nome: ${name || '-'}`,
                `Email: ${email || '-'}`,
                '',
                'Messaggio:',
                `${message || '-'}`
            ].join('\n')
        );

        return `mailto:${fallbackMail}?subject=${subject}&body=${body}`;
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.reportValidity()) return;

        const formData = new FormData(form);
        const data = {
            name: String(formData.get('name') || '').trim(),
            email: String(formData.get('email') || '').trim(),
            message: String(formData.get('message') || '').trim()
        };

        setSubmittingState(true, 'Invio...');

        try {
            if (endpoint) {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                setSubmittingState(true, 'Inviato!', '#22c55e');
            } else {
                window.location.href = buildMailtoUrl(data);
                setSubmittingState(true, 'Apri email', '#22c55e');
            }

            form.reset();
        } catch (error) {
            setSubmittingState(true, 'Errore invio', '#dc2626');
        }

        setTimeout(() => {
            resetButtonState();
        }, 2000);
    });

    const inputs = form.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('focus', () => {
            input.parentElement.classList.add('focused');
        });
        input.addEventListener('blur', () => {
            if (!input.value) {
                input.parentElement.classList.remove('focused');
            }
        });
    });
}

function initAIAssistant() {
    const widget = document.getElementById('ai-widget');
    const panel = document.getElementById('ai-widget-panel');
    const toggleBtn = document.getElementById('ai-widget-toggle');
    const closeBtn = document.getElementById('ai-widget-close');
    const form = document.getElementById('ai-assistant-form');
    if (!widget || !panel || !toggleBtn || !closeBtn || !form) return;

    const questionInput = document.getElementById('ai-question');
    const submitBtn = form.querySelector('.ai-submit-btn');
    const btnText = form.querySelector('.ai-btn-text');
    const chatThread = document.getElementById('ai-chat-thread');
    if (!questionInput || !submitBtn || !btnText || !chatThread) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const setWidgetOpen = (shouldOpen, { focusInput = false } = {}) => {
        widget.dataset.open = shouldOpen ? 'true' : 'false';
        toggleBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
        panel.setAttribute('aria-hidden', shouldOpen ? 'false' : 'true');
        panel.inert = !shouldOpen;

        if (shouldOpen && focusInput) {
            window.setTimeout(() => {
                questionInput.focus();
            }, 120);
        }
    };

    setWidgetOpen(false);

    toggleBtn.addEventListener('click', () => {
        const isOpen = widget.dataset.open === 'true';
        setWidgetOpen(!isOpen, { focusInput: !isOpen });
    });

    const quickOpenButtons = document.querySelectorAll('[data-open-ai-widget]');
    quickOpenButtons.forEach((button) => {
        button.addEventListener('click', () => {
            setWidgetOpen(true, { focusInput: true });
        });
    });

    closeBtn.addEventListener('click', () => {
        setWidgetOpen(false);
        toggleBtn.focus();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && widget.dataset.open === 'true') {
            setWidgetOpen(false);
            toggleBtn.focus();
        }
    });

    const setLoading = (isLoading) => {
        submitBtn.disabled = isLoading;
        questionInput.disabled = isLoading;
        btnText.textContent = isLoading ? 'Attendi...' : 'Invia domanda';
    };

    const scrollChatToBottom = () => {
        chatThread.scrollTop = chatThread.scrollHeight;
    };

    const appendBubble = (role, text = '') => {
        const bubble = document.createElement('div');
        bubble.className = role === 'user'
            ? 'ai-chat-bubble ai-chat-bubble-user'
            : 'ai-chat-bubble ai-chat-bubble-assistant';
        bubble.textContent = text;
        chatThread.appendChild(bubble);
        scrollChatToBottom();
        return bubble;
    };

    const appendLoadingBubble = () => {
        const bubble = document.createElement('div');
        bubble.className = 'ai-chat-bubble ai-chat-bubble-assistant ai-chat-bubble-loading';
        bubble.innerHTML = '<span class="ai-typing-indicator" aria-hidden="true"><span class="ai-typing-bar"></span><span class="ai-typing-bar"></span><span class="ai-typing-bar"></span></span><span class="ai-typing-text">sto scrivendo...</span>';
        chatThread.appendChild(bubble);
        scrollChatToBottom();
        return bubble;
    };

    const setAssistantResponse = (text) => {
        const message = String(text || '').trim();
        if (!message) return;
        const bubble = appendBubble('assistant', message);
        if (!prefersReducedMotion) {
            bubble.animate(
                [
                    { opacity: 0, transform: 'translateY(4px)' },
                    { opacity: 1, transform: 'translateY(0)' }
                ],
                { duration: 220, easing: 'ease-out' }
            );
        }
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const question = String(questionInput.value || '').trim();
        if (!question) {
            questionInput.focus();
            return;
        }

        setWidgetOpen(true);
        appendBubble('user', question);
        questionInput.value = '';
        setLoading(true);
        const loadingBubble = appendLoadingBubble();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ question })
            });

            let payload = null;
            try {
                payload = await response.json();
            } catch (_error) {
                payload = null;
            }

            if (!response.ok || !payload?.ok || !payload?.answer) {
                throw new Error(payload?.error || `HTTP ${response.status}`);
            }

            loadingBubble.remove();
            setAssistantResponse(payload.answer);

            if (typeof trackCustomEvent === 'function') {
                trackCustomEvent('ai_assistant_question', {
                    question_length: question.length
                });
            }
        } catch (_error) {
            loadingBubble.remove();
            setAssistantResponse('Ora non riesco a rispondere. Scrivimi su WhatsApp e ti aiuto io.');
        } finally {
            setLoading(false);
            questionInput.focus();
        }
    });
}

// Smooth scroll for navigation links
function initSmoothScroll() {
    const navLinks = document.querySelectorAll('a[href^="#"]');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const target = document.querySelector(targetId);

            if (target) {
                const navHeight = document.querySelector('.nav').offsetHeight;
                const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight;

                window.scrollTo({
                    top: targetPosition,
                    behavior: prefersReducedMotion ? 'auto' : 'smooth'
                });
            }
        });
    });
}

// FAQ Section Accordion
function initFAQAccordion() {
    const faqItems = document.querySelectorAll('.faq-item');

    if (!faqItems.length) return;

    const setItemState = (item, expanded) => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');
        if (!question || !answer) return;

        question.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        item.classList.toggle('active', expanded);
        answer.style.maxHeight = expanded ? `${answer.scrollHeight}px` : '0px';
    };

    faqItems.forEach(item => setItemState(item, false));

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        if (!question) return;

        question.addEventListener('click', () => {
            const isExpanded = question.getAttribute('aria-expanded') === 'true';

            // Close all other items (optional - remove if you want multiple open)
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    setItemState(otherItem, false);
                }
            });

            // Toggle current item
            setItemState(item, !isExpanded);
        });
    });

    window.addEventListener('resize', () => {
        faqItems.forEach(item => {
            if (!item.classList.contains('active')) return;
            const answer = item.querySelector('.faq-answer');
            if (answer) answer.style.maxHeight = `${answer.scrollHeight}px`;
        });
    });
}

// Page load animation
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

function initFooterYear() {
    const footerYear = document.getElementById('footer-year');
    if (!footerYear) return;
    footerYear.textContent = String(new Date().getFullYear());
}
