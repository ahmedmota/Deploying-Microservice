import React from 'react';
import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
  return (
    <div className="home">
      <div className="hero">
        <h1>Welcome to E-Commerce Microservices</h1>
        <p>A modern, scalable e-commerce platform built with microservices architecture</p>
        <Link to="/products" className="btn btn-primary btn-large">
          Browse Products
        </Link>
      </div>

      <div className="features">
        <h2>Architecture Features</h2>
        <div className="grid grid-3">
          <div className="card">
            <h3>User Service</h3>
            <p>Authentication, authorization, and user profile management</p>
          </div>
          <div className="card">
            <h3>Product Service</h3>
            <p>Product catalog with Redis caching and category management</p>
          </div>
          <div className="card">
            <h3>Order Service</h3>
            <p>Order processing with inter-service communication</p>
          </div>
          <div className="card">
            <h3>Payment Service</h3>
            <p>Secure payment processing with idempotency</p>
          </div>
          <div className="card">
            <h3>Notification Service</h3>
            <p>Email and SMS notifications via AWS SES/SNS</p>
          </div>
          <div className="card">
            <h3>API Gateway</h3>
            <p>Single entry point for all microservices</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
