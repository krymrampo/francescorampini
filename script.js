// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    initHeroAnimation();
    initScrollReveal();
    initFormHandling();
    initSmoothScroll();
    initEmailDemo();
    initFAQAccordion();
});

// Navigation scroll behavior - navbar stays fixed and visible
function initHeroAnimation() {
    const typingName = document.getElementById('typing-name');
    const heroTagline = document.querySelector('.hero-tagline');
    const heroSubtitle = document.querySelector('.hero-subtitle');
    const heroCta = document.querySelector('.hero-cta');
    const terminalWindow = document.querySelector('.terminal-window');
    const terminalCommand = document.getElementById('terminal-cmd');
    const terminalOutput = document.getElementById('terminal-output');

    const name = 'Francesco Rampini';
    const command = 'python email_automation.py';

    // Nome: già presente nel DOM con CSS animation
    if (typingName) {
        typingName.textContent = name;
    }

    // Animate tagline
    setTimeout(() => {
        if (heroTagline) heroTagline.classList.add('animate');
    }, 800);

    // Animate subtitle
    setTimeout(() => {
        if (heroSubtitle) heroSubtitle.classList.add('animate');
    }, 1100);

    // Animate CTA
    setTimeout(() => {
        if (heroCta) heroCta.classList.add('animate');
    }, 1400);

    // Type command in terminal
    setTimeout(() => {
        if (terminalCommand) {
            typeText(terminalCommand, command, 40);
        }
    }, 1800);

    // Codice Python: scrittura carattere per carattere per ogni riga (più veloce)
    setTimeout(() => {
        if (terminalOutput) {
            const lines = terminalOutput.querySelectorAll('.output-line');
            typeCodeLines(lines, 0, 8);
        }
    }, 2400);
}

// Type code lines character by character
function typeCodeLines(lines, index, speed) {
    if (index >= lines.length) return;

    const line = lines[index];
    const originalHTML = line.innerHTML;
    const text = line.textContent;
    line.textContent = '';
    line.style.opacity = '1';

    let charIndex = 0;
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = originalHTML;

    function typeChar() {
        if (charIndex < text.length) {
            // Ricostruisci l'HTML progressivamente
            const partialText = text.substring(0, charIndex + 1);
            line.textContent = partialText;
            charIndex++;
            setTimeout(typeChar, speed);
        } else {
            // Riga completa, ripristina HTML originale con syntax highlighting
            line.innerHTML = originalHTML;
            // Passa alla riga successiva
            setTimeout(() => {
                typeCodeLines(lines, index + 1, speed);
            }, 50);
        }
    }

    typeChar();
}

// Type text animation
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

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');

        question.addEventListener('click', () => {
            const isExpanded = question.getAttribute('aria-expanded') === 'true';

            // Close all other items (optional - remove if you want multiple open)
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
                }
            });

            // Toggle current item
            question.setAttribute('aria-expanded', !isExpanded);
            item.classList.toggle('active');
        });
    });
}

// Page load animation
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});