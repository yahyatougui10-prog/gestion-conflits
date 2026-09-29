class PresentationController {
    constructor() {
        this.slides = [];
        this.currentIndex = 0;
        this.totalSlides = 10;
        this.controlsTimeout = null;
        this.swipeStart = null;
        this.wheelLock = false;
        this.soundOn = false;
        this.audioCtx = null;
        this.init();
    }

    async init() {
        this.bindEvents();
        await this.loadSlides();
        this.buildDots();
        this.buildMenu();
        this.updateUI();
        this.startControlTimer();
    }

    bindEvents() {
        this.el = {
            prev: document.getElementById('prevBtn'),
            next: document.getElementById('nextBtn'),
            counter: document.getElementById('slideCounter'),
            dots: document.getElementById('dotsWrap'),
            bar: document.getElementById('progressFill'),
            menu: document.getElementById('slideMenu'),
            menuGrid: document.getElementById('menuGrid'),
            menuBtn: document.getElementById('menuBtn'),
            menuClose: document.getElementById('menuClose'),
            sound: document.getElementById('soundBtn'),
            fs: document.getElementById('fsBtn'),
            help: document.getElementById('helpOverlay'),
            helpBtn: document.getElementById('helpBtn'),
            helpClose: document.getElementById('helpClose'),
            controls: document.querySelector('.presentation-controls'),
        };

        this.el.prev.addEventListener('click', () => this.previousSlide());
        this.el.next.addEventListener('click', () => this.nextSlide());
        this.el.menuBtn.addEventListener('click', () => this.toggleMenu());
        this.el.menuClose.addEventListener('click', () => this.closeMenu());
        this.el.sound.addEventListener('click', () => this.toggleSound());
        this.el.fs.addEventListener('click', () => this.toggleFullscreen());
        this.el.helpBtn.addEventListener('click', () => this.toggleHelp());
        this.el.helpClose.addEventListener('click', () => this.closeHelp());

        this.el.help.addEventListener('click', (e) => {
            if (e.target === this.el.help || e.target === this.el.help.querySelector('.help-card')) {
                this.closeHelp();
            }
        });
        this.el.menu.addEventListener('click', (e) => {
            if (e.target === this.el.menu) this.closeMenu();
        });

        document.addEventListener('keydown', (e) => this.handleKeydown(e));

        window.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });

        document.addEventListener('touchstart', (e) => {
            this.swipeStart = e.touches[0].clientX;
        }, { passive: true });
        document.addEventListener('touchend', (e) => {
            if (this.swipeStart === null) return;
            const dx = e.changedTouches[0].clientX - this.swipeStart;
            if (Math.abs(dx) > 60) {
                dx > 0 ? this.previousSlide() : this.nextSlide();
            }
            this.swipeStart = null;
        }, { passive: true });

        document.addEventListener('mousemove', () => this.startControlTimer());
        document.addEventListener('keydown', () => this.startControlTimer());
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.presentation-controls')) this.startControlTimer();
        });
    }

    async loadSlides() {
        try {
            const res = await fetch('/api/slides');
            this.slides = await res.json();
            this.totalSlides = this.slides.length;
        } catch (err) {
            this.slides = Array.from({ length: this.totalSlides }, (_, i) => ({
                id: i + 1,
                title: `Slide ${i + 1}`,
                type: '',
            }));
        }
    }

    buildDots() {
        const frag = document.createDocumentFragment();
        for (let i = 1; i <= this.totalSlides; i++) {
            const dot = document.createElement('button');
            dot.className = 'progress-dot';
            dot.type = 'button';
            dot.title = `Aller au slide ${i}`;
            dot.setAttribute('aria-label', `Aller au slide ${i}`);
            dot.addEventListener('click', () => this.goToSlide(i));
            frag.appendChild(dot);
        }
        this.el.dots.innerHTML = '';
        this.el.dots.appendChild(frag);
    }

    buildMenu() {
        const frag = document.createDocumentFragment();
        this.slides.forEach((s, i) => {
            const card = document.createElement('button');
            card.className = 'menu-card';
            card.type = 'button';
            card.dataset.index = i;
            const num = document.createElement('span');
            num.className = 'menu-num';
            num.textContent = String(i + 1).padStart(2, '0');
            const title = document.createElement('span');
            title.className = 'menu-title';
            title.textContent = s.title;
            const type = document.createElement('span');
            type.className = `menu-type type-${s.type}`;
            type.textContent = s.type || 'slide';
            card.append(num, title, type);
            card.addEventListener('click', () => {
                this.goToSlide(i + 1);
                this.closeMenu();
            });
            frag.appendChild(card);
        });
        this.el.menuGrid.appendChild(frag);
    }

    handleKeydown(e) {
        if (e.code === 'Escape') {
            if (this.isMenuOpen()) return this.closeMenu();
            if (this.isHelpOpen()) return this.closeHelp();
        }
        if (this.isMenuOpen()) {
            if (e.key === 'Tab') this.trapFocus(e, this.el.menu);
            return;
        }
        if (this.isHelpOpen()) {
            if (e.key === 'Tab') this.trapFocus(e, this.el.help);
            return;
        }

        switch (e.key) {
            case 'ArrowRight':
            case 'ArrowDown':
            case 'PageDown':
            case ' ':
                e.preventDefault();
                this.nextSlide();
                break;
            case 'ArrowLeft':
            case 'ArrowUp':
            case 'PageUp':
                e.preventDefault();
                this.previousSlide();
                break;
            case 'Home':
                e.preventDefault();
                this.goToSlide(1);
                break;
            case 'End':
                e.preventDefault();
                this.goToSlide(this.totalSlides);
                break;
            case 'm':
            case 'M':
                this.toggleMenu();
                break;
            case 'f':
            case 'F':
                this.toggleFullscreen();
                break;
            case 's':
            case 'S':
                this.toggleSound();
                break;
            case '?':
            case 'h':
            case 'H':
                this.toggleHelp();
                break;
            default:
                if (e.key >= '1' && e.key <= '9') this.goToSlide(parseInt(e.key, 10));
                if (e.key === '0') this.goToSlide(10);
        }
    }

    handleWheel(e) {
        if (this.isMenuOpen() || this.isHelpOpen()) return;
        if (this.wheelLock) return;
        const slide = document.querySelector('.slide.active');
        if (slide && slide.scrollHeight > slide.clientHeight + 2) {
            const atTop = slide.scrollTop <= 0;
            const atBottom = slide.scrollTop + slide.clientHeight >= slide.scrollHeight - 2;
            if ((e.deltaY < 0 && !atTop) || (e.deltaY > 0 && !atBottom)) return;
        }
        if (Math.abs(e.deltaY) < 30) return;
        this.wheelLock = true;
        e.deltaY > 0 ? this.nextSlide() : this.previousSlide();
        setTimeout(() => { this.wheelLock = false; }, 700);
    }

    nextSlide() {
        if (this.currentIndex < this.totalSlides - 1) {
            this.currentIndex++;
            this.updateUI('next');
        }
    }

    previousSlide() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.updateUI('prev');
        }
    }

    goToSlide(n) {
        if (n >= 1 && n <= this.totalSlides) {
            this.currentIndex = n - 1;
            this.updateUI();
        }
    }

    updateUI(direction = 'auto') {
        const slides = document.querySelectorAll('.slide');
        slides.forEach((slide, index) => {
            const isActive = index === this.currentIndex;
            slide.classList.toggle('active', isActive);
        });

        this.el.bar.style.width = `${((this.currentIndex + 1) / this.totalSlides) * 100}%`;

        document.querySelectorAll('.progress-dot').forEach((dot, index) => {
            const isActive = index === this.currentIndex;
            dot.classList.toggle('active', isActive);
            if (isActive) dot.setAttribute('aria-current', 'true');
            else dot.removeAttribute('aria-current');
            if (index < this.currentIndex) dot.classList.add('done');
            else dot.classList.remove('done');
        });

        this.el.counter.innerText = `${this.currentIndex + 1} / ${this.totalSlides}`;

        this.el.prev.disabled = this.currentIndex === 0;
        this.el.next.disabled = this.currentIndex === this.totalSlides - 1;

        this.el.menuGrid.querySelectorAll('.menu-card').forEach((card, i) => {
            const isCurrent = i === this.currentIndex;
            card.classList.toggle('current', isCurrent);
            if (isCurrent) card.setAttribute('aria-current', 'true');
            else card.removeAttribute('aria-current');
        });

        if (this.soundOn) this.pop();

        // Direction-aware slide entrance
        const activeSlide = slides[this.currentIndex];
        if (activeSlide) {
            activeSlide.dataset.dir = direction;
            activeSlide.classList.remove('entering');
            void activeSlide.offsetWidth; // reflow to restart animation
            activeSlide.classList.add('entering');
            clearTimeout(this.enterTimer);
            this.enterTimer = setTimeout(() => {
                activeSlide.classList.remove('entering');
            }, 900);
        }
    }

    toggleMenu() {
        const open = this.el.menu.classList.toggle('open');
        this.el.menu.setAttribute('aria-hidden', String(!open));
        document.body.classList.toggle('no-scroll', open);
        if (open) {
            this.lastFocused = document.activeElement;
            this.el.menuClose.focus();
        } else {
            this.restoreFocus();
        }
    }

    closeMenu() {
        this.el.menu.classList.remove('open');
        this.el.menu.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('no-scroll');
        this.restoreFocus();
    }

    restoreFocus() {
        if (this.lastFocused && document.contains(this.lastFocused)) {
            this.lastFocused.focus({ preventScroll: true });
        }
        this.lastFocused = null;
    }

    isMenuOpen() {
        return this.el.menu.classList.contains('open');
    }

    toggleHelp() {
        const open = this.el.help.classList.toggle('open');
        this.el.help.setAttribute('aria-hidden', String(!open));
        if (open) {
            this.lastFocused = document.activeElement;
            this.el.helpClose.focus();
        } else {
            this.restoreFocus();
        }
    }

    closeHelp() {
        this.el.help.classList.remove('open');
        this.el.help.setAttribute('aria-hidden', 'true');
        this.restoreFocus();
    }

    isHelpOpen() {
        return this.el.help.classList.contains('open');
    }

    trapFocus(e, container) {
        const focusables = [...container.querySelectorAll(
            'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )].filter((el) => el.offsetParent !== null);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        }
    }

    toggleFullscreen() {
        if (!document.fullscreenElement) {
            (document.documentElement.requestFullscreen() || Promise.resolve()).catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    }

    toggleSound() {
        this.soundOn = !this.soundOn;
        this.el.sound.textContent = this.soundOn ? '🔊' : '🔇';
        this.el.sound.setAttribute('aria-pressed', String(this.soundOn));
        if (this.soundOn) this.pop();
    }

    pop() {
        try {
            this.audioCtx = this.audioCtx || new (window.AudioContext || window.webkitAudioContext)();
            if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
            const t = this.audioCtx.currentTime;
            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.type = 'square';
            osc.frequency.setValueAtTime(320, t);
            osc.frequency.exponentialRampToValueAtTime(520, t + 0.08);
            gain.gain.setValueAtTime(0.12, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);
            osc.start(t);
            osc.stop(t + 0.13);
        } catch (e) { /* audio unavailable */ }
    }

    startControlTimer() {
        this.el.controls.classList.remove('controls-hidden');
        if (this.isMenuOpen() || this.isHelpOpen() || this.soundOn) return;
        clearTimeout(this.controlsTimeout);
        this.controlsTimeout = setTimeout(() => {
            this.el.controls.classList.add('controls-hidden');
        }, 3500);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new PresentationController();
});