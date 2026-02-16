// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initHeroAnimation();
    initScrollReveal();
    initFormHandling();
    initSmoothScroll();
    initEmailDemo();
    initFAQAccordion();
    initFooterYear();
});

// Hero animation - OTTIMIZZATA per performance
function initHeroAnimation() {
    const heroTitle = document.querySelector('.hero-title');
    const heroTagline = document.getElementById('typing-description');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    const heroCta = document.querySelector('.hero-cta');
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const description = 'aiuto le attività e professionisti ad alleggerire e efficientare il loro lavoro';

    // Verifica che gli elementi esistano per evitare errori
    if (!heroTagline) return;

    // Animate title (fade in) - usa CSS animation invece di JS quando possibile
    if (heroTitle) {
        heroTitle.style.opacity = '1';
        heroTitle.style.transform = 'translateY(0)';
    }

    if (prefersReducedMotion) {
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
            heroTagline.style.opacity = '1';
            heroTagline.style.transform = 'translateY(0)';

            // Avvia l'animazione typewriter
            typeTextWithCursor(heroTagline, description, 45);

            // Calcola quando finisce l'animazione (ms per carattere * numero caratteri)
            const animDuration = description.length * 45;

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
