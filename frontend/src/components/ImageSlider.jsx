import React, { useState, useEffect } from 'react';

const ImageSlider = () => {
    const [currentSlide, setCurrentSlide] = useState(0);

    const slides = [
        {
            id: 1,
            title: "Find Your Dream Career",
            subtitle: "Connect with top employers worldwide",
            image: "/slider1.png"
        },
        {
            id: 2,
            title: "Professional Growth Awaits",
            subtitle: "Discover opportunities that match your skills",
            image: "/slider2.png"
        },
        {
            id: 3,
            title: "Your Next Chapter Starts Here",
            subtitle: "Join thousands of successful job seekers",
            image: "/slider3.png"
        }
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % slides.length);
        }, 5000);

        return () => clearInterval(timer);
    }, [slides.length]);

    const goToSlide = (index) => {
        setCurrentSlide(index);
    };

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % slides.length);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    };

    return (
        <div className="slider-container">
            <div className="slider-wrapper">
                {slides.map((slide, index) => (
                    <div
                        key={slide.id}
                        className={`slide ${index === currentSlide ? 'active' : ''}`}
                        style={{
                            backgroundImage: `linear-gradient(rgba(102, 126, 234, 0.7), rgba(118, 75, 162, 0.7)), url(${slide.image})`,
                        }}
                    >
                        <div className="slide-content">
                            <h2 className="slide-title">{slide.title}</h2>
                            <p className="slide-subtitle">{slide.subtitle}</p>
                        </div>
                    </div>
                ))}
            </div>

            <button className="slider-btn slider-btn-prev" onClick={prevSlide}>
                &#10094;
            </button>
            <button className="slider-btn slider-btn-next" onClick={nextSlide}>
                &#10095;
            </button>

            <div className="slider-dots">
                {slides.map((_, index) => (
                    <button
                        key={index}
                        className={`slider-dot ${index === currentSlide ? 'active' : ''}`}
                        onClick={() => goToSlide(index)}
                    />
                ))}
            </div>
        </div>
    );
};

export default ImageSlider;
