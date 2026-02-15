// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initHeroAnimation();
    initScrollReveal();
    initFormHandling();
    initSmoothScroll();
    initEmailDemo();
    initFAQAccordion();
});

// Hero animation - OTTIMIZZATA per performance
function initHeroAnimation() {
    const heroTitle = document.querySelector('.hero-title');
    const heroTagline = document.getElementById('typing-description');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    const heroCta = document.querySelector('.hero-cta');

    const description = 'aiuto le attività e professionisti ad alleggerire e efficientare il loro lavoro';

    // Verifica che gli elementi esistano per evitare errori
    if (!heroTagline) return;

    // Animate title (fade in) - usa CSS animation invece di JS quando possibile
    if (heroTitle) {
        heroTitle.style.opacity = '1';
        heroTitle.style.transform = 'translateY(0)';
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
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.delay || 0;
                setTimeout(() => {
                    entry.target.classList.add('animate');
                }, parseInt(delay));
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const animatables = document.querySelectorAll('.service-item, .process-step-new, .fade-in, .case-card');
    animatables.forEach(el => observer.observe(el));

    // Timeline animation
    const timeline = document.querySelector('.process-timeline');
    if (timeline) {
        const timelineObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate');
                    timelineObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.2 });

        timelineObserver.observe(timeline);
    }
}

// Email Demo - Split Layout Navigation
function initEmailDemo() {
    const stepNavs = document.querySelectorAll('.demo-step-nav');
    const stepPanels = document.querySelectorAll('.demo-step-panel');

    if (!stepNavs.length || !stepPanels.length) return;

    function activateStep(stepNumber) {
        // Update navigation
        stepNavs.forEach(nav => {
            nav.classList.remove('active');
            if (nav.dataset.step === stepNumber) {
                nav.classList.add('active');
            }
        });

        // Update panel
        stepPanels.forEach(panel => {
            panel.classList.remove('active');
            if (panel.dataset.step === stepNumber) {
                panel.classList.add('active');
            }
        });
    }

    // Click handlers for navigation
    stepNavs.forEach(nav => {
        nav.addEventListener('click', () => {
            activateStep(nav.dataset.step);
        });
    });

    // Optional: keyboard navigation
    document.addEventListener('keydown', (e) => {
        const activeNav = document.querySelector('.demo-step-nav.active');
        if (!activeNav) return;

        const currentStep = parseInt(activeNav.dataset.step);
        const totalSteps = stepNavs.length;

        if (e.key === 'ArrowDown' && currentStep < totalSteps) {
            e.preventDefault();
            activateStep(String(currentStep + 1));
        } else if (e.key === 'ArrowUp' && currentStep > 1) {
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

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(form);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            message: formData.get('message')
        };

        btnText.textContent = 'Invio...';
        submitBtn.disabled = true;

        await new Promise(resolve => setTimeout(resolve, 1500));

        btnText.textContent = 'Inviato!';
        submitBtn.style.borderColor = '#22c55e';
        submitBtn.style.color = '#22c55e';

        setTimeout(() => {
            form.reset();
            btnText.textContent = 'Invia';
            submitBtn.disabled = false;
            submitBtn.style.borderColor = '';
            submitBtn.style.color = '';
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
                    behavior: 'smooth'
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
