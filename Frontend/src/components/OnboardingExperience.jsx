import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { onboardingSlides } from './onboardingSlides';

const TransitionScreen = () => (
  <div className="onboarding-transition-screen">
    <div className="onboarding-transition-logo">
      <img
        src={`${process.env.PUBLIC_URL}/attendify-logo.png`}
        alt="Attendify logo"
        className="h-20 w-20 object-contain"
        loading="lazy"
      />
      <span className="onboarding-logo-pulse" />
    </div>
    <div className="text-center">
      <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-950 dark:text-white md:text-5xl">
        Welcome to Attendify
      </h1>
      <p className="mt-3 text-base text-slate-600 dark:text-slate-300 md:text-lg">
        Your student companion is ready.
      </p>
    </div>
    <div className="onboarding-loader" aria-label="Loading Attendify">
      <span />
      <span />
      <span />
    </div>
    <p className="absolute bottom-8 text-sm text-slate-500 dark:text-slate-400">
      Built with <span aria-label="love" style={{ color: '#ef4444' }}>❤️</span> by HRK Groups
    </p>
  </div>
);

const ProgressDots = ({ activeIndex, total }) => (
  <div className="onboarding-progress" aria-label={`Slide ${activeIndex + 1} of ${total}`}>
    {Array.from({ length: total }).map((_, index) => (
      <span
        key={index}
        className={`onboarding-dot ${index === activeIndex ? 'onboarding-dot-active' : ''}`}
      />
    ))}
  </div>
);

const HighlightTitle = ({ slide }) => {
  if (slide.final) {
    return (
      <h1 className="onboarding-final-title">
        <span>{slide.finalTitle}</span>
        <strong>{slide.finalProduct}</strong>
      </h1>
    );
  }

  if (!slide.highlight || !slide.title.includes(slide.highlight)) {
    return <h1 className="onboarding-title">{slide.title}</h1>;
  }

  const [before, after] = slide.title.split(slide.highlight);
  return (
    <h1 className="onboarding-title">
      {before}
      <span>{slide.highlight}</span>
      {after}
    </h1>
  );
};

const FinalMessage = ({ slide }) => (
  <div className="onboarding-final-message">
    <div className="onboarding-final-highlights">
      {slide.highlights.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.title} className="onboarding-final-highlight">
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span>
              <strong>{item.title}</strong>
              <small>{item.detail}</small>
            </span>
          </div>
        );
      })}
    </div>
    <div className="onboarding-mission">
      <p className="onboarding-mission-main">
        <strong>Attendify is our first step toward building technology that empowers students every day.</strong>
      </p>
      <p className="onboarding-mission-secondary"><em>Every great journey deserves a great tool.</em></p>
      <p className="onboarding-mission-secondary"><em>Thank you for letting us be part of yours.</em></p>
      <div className="onboarding-mission-brand">
        <strong>
          Built with <span style={{ color: '#ef4444' }}>❤️</span> by HRK Technologies
        </strong>
        <small>A product of HRK Groups</small>
        <small>Technology • Innovation • Impact</small>
      </div>
    </div>
  </div>
);

const OnboardingExperience = ({ preview = false, onComplete, onSkip }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const activeSlide = onboardingSlides[activeIndex];
  const Illustration = activeSlide.illustration;
  const EyebrowIcon = activeSlide.eyebrowIcon;
  const isFirstSlide = activeIndex === 0;
  const isLastSlide = activeIndex === onboardingSlides.length - 1;

  const containerClassName = useMemo(
    () => `onboarding-root ${activeSlide.background} onboarding-accent-${activeSlide.accent} ${activeSlide.final ? 'onboarding-final' : ''}`,
    [activeSlide]
  );

  const finish = useCallback(async () => {
    if (processing) return;
    setProcessing(true);
    window.setTimeout(() => {
      setTransitioning(true);
      window.setTimeout(async () => {
        await onComplete?.({ preview });
      }, 1500);
    }, 240);
  }, [onComplete, preview, processing]);

  const handleNext = useCallback(() => {
    if (processing) return;
    if (isLastSlide) {
      finish();
      return;
    }
    setActiveIndex((current) => Math.min(current + 1, onboardingSlides.length - 1));
  }, [finish, isLastSlide, processing]);

  const handleBack = useCallback(() => {
    if (processing || isFirstSlide) return;
    setActiveIndex((current) => Math.max(current - 1, 0));
  }, [isFirstSlide, processing]);

  const handleSkip = useCallback(() => {
    if (processing || isLastSlide) return;
    onSkip?.({ preview });
  }, [isLastSlide, onSkip, preview, processing]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (transitioning || processing) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
      }
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handleBack();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleBack, handleNext, handleSkip, processing, transitioning]);

  if (transitioning) {
    return <TransitionScreen />;
  }

  return (
    <section className={containerClassName} data-testid={preview ? 'onboarding-preview' : 'student-onboarding'}>
      <div className="onboarding-shell">
        <article key={activeSlide.id} className="onboarding-card">

          {/* Top bar: icon + counter */}
          <div className="onboarding-card-top">
            <div className="onboarding-brand-mark">
              {EyebrowIcon && <EyebrowIcon className="h-6 w-6" aria-hidden="true" />}
            </div>
            <span className="onboarding-counter">{activeIndex + 1} / {onboardingSlides.length}</span>
          </div>

          {/* Content: title + illustration */}
          <div className="onboarding-content">
            <div className="onboarding-copy">
              <HighlightTitle slide={activeSlide} />
              {activeSlide.final ? (
                <div className="onboarding-sparkle-rule">
                  <span className="onboarding-rule-line" />
                  <Sparkles className="h-4 w-4 text-violet-400" aria-hidden="true" />
                  <span className="onboarding-rule-line" />
                </div>
              ) : (
                <span className="onboarding-title-rule" />
              )}
              <p className="onboarding-description">{activeSlide.description}</p>
            </div>

            <div className="onboarding-art" aria-hidden="true">
              <Illustration />
            </div>
          </div>

          {/* Final screen: badges + mission */}
          {activeSlide.final && <FinalMessage slide={activeSlide} />}

          {/* Footer navigation */}
          {!isLastSlide ? (
            <footer className="onboarding-footer">
              <div className="onboarding-footer-side">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="onboarding-nav-link"
                  disabled={processing}
                >
                  Skip
                </button>
                {!isFirstSlide && (
                  <button
                    type="button"
                    onClick={handleBack}
                    className="onboarding-back-button"
                    disabled={processing}
                    aria-label="Go back"
                  >
                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                    <span>Back</span>
                  </button>
                )}
              </div>

              <ProgressDots activeIndex={activeIndex} total={onboardingSlides.length} />

              <div className="onboarding-footer-end">
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={processing}
                  className="onboarding-next-button"
                  aria-label={activeSlide.cta}
                >
                  {processing ? (
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                  ) : (
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  )}
                </button>
              </div>
            </footer>
          ) : (
            /* Final screen CTA */
            <div className="onboarding-final-footer">
              <ProgressDots activeIndex={activeIndex} total={onboardingSlides.length} />
              <div className="onboarding-final-cta-row">
                <span className="onboarding-dot-decoration" aria-hidden="true" />
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={processing}
                  className="onboarding-primary-button"
                  aria-label={activeSlide.cta}
                >
                  {processing ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    </>
                  ) : (
                    <>
                      <span>Enter Attendify</span>
                      <ArrowRight className="h-5 w-5" aria-hidden="true" />
                    </>
                  )}
                </button>
                <span className="onboarding-dot-decoration" aria-hidden="true" />
              </div>
            </div>
          )}

        </article>
      </div>
    </section>
  );
};

export default OnboardingExperience;
