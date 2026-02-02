import React, { useState, useEffect } from 'react';

const TestimonialSlider = () => {
    const [currentTestimonial, setCurrentTestimonial] = useState(0);

    const testimonials = [
        {
            id: 1,
            name: "Sarah Johnson",
            role: "Software Engineer",
            company: "Tech Corp",
            image: "/testimonial1.png",
            quote: "WorkHub helped me land my dream job at a top tech company. The platform is intuitive and the job matches were perfect for my skills!"
        },
        {
            id: 2,
            name: "Michael Chen",
            role: "Product Manager",
            company: "Innovation Labs",
            image: "/testimonial2.png",
            quote: "I was amazed by how quickly I found relevant opportunities. The personalized recommendations saved me so much time in my job search."
        },
        {
            id: 3,
            name: "Emily Rodriguez",
            role: "UX Designer",
            company: "Design Studio",
            image: "/testimonial3.png",
            quote: "The best job platform I've used! Professional, easy to navigate, and filled with quality opportunities. Highly recommended!"
        }
    ];

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
        }, 6000);

        return () => clearInterval(timer);
    }, [testimonials.length]);

    const goToTestimonial = (index) => {
        setCurrentTestimonial(index);
    };

    const nextTestimonial = () => {
        setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    };

    const prevTestimonial = () => {
        setCurrentTestimonial((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    };

    return (
        <div className="testimonial-slider">
            <div className="testimonial-wrapper">
                {testimonials.map((testimonial, index) => (
                    <div
                        key={testimonial.id}
                        className={`testimonial-slide ${index === currentTestimonial ? 'active' : ''}`}
                    >
                        <div className="testimonial-content">
                            <img
                                src={testimonial.image}
                                alt={testimonial.name}
                                className="testimonial-image"
                            />
                            <blockquote className="testimonial-quote">
                                "{testimonial.quote}"
                            </blockquote>
                            <div className="testimonial-author">
                                <h4>{testimonial.name}</h4>
                                <p>{testimonial.role} at {testimonial.company}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <button className="testimonial-btn testimonial-btn-prev" onClick={prevTestimonial}>
                &#10094;
            </button>
            <button className="testimonial-btn testimonial-btn-next" onClick={nextTestimonial}>
                &#10095;
            </button>

            <div className="testimonial-dots">
                {testimonials.map((_, index) => (
                    <button
                        key={index}
                        className={`testimonial-dot ${index === currentTestimonial ? 'active' : ''}`}
                        onClick={() => goToTestimonial(index)}
                    />
                ))}
            </div>
        </div>
    );
};

export default TestimonialSlider;
