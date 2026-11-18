---
title: "From Individual Learning to Market Equilibrium: Correcting Structural and Parametric Biases in RL Simulations of Economic Models"
collection: publications
category: manuscripts
permalink: /publication/computational
date: 2026-09-09
authors: ["Ruxin Chen", "Zeqiang Zhang*"]
venue: "Computational Economics"
venue_short: "Comput. Econ."
cv: "first"
cv_rank: 4
cv_zh: "Computational Economics，<strong>SSCI/SCI检索</strong>，JCR Q2，IF 2.1"
paperurl: 'https://arxiv.org/abs/2507.18229'
demourl: '/demos/computational/'
---

Applying Reinforcement Learning (RL) to economic modeling reveals a fundamental tension: standard RL agents do not behave as competitive price-takers. While macroeconomic models typically assume agents take aggregate conditions as given, a naive single-agent RL algorithm learns to internalize its impact on the environment, effectively exerting market power. We illustrate this divergence in a search-and-matching model with concave production, showing that a standard RL agent converges to a monopsonistic allocation rather than the competitive equilibrium. Furthermore, we show that RL's approach to time discounting distorts standard intertemporal economic trade-offs. To resolve these issues, we propose a Calibrated Mean-Field Reinforcement Learning framework that restricts the agent to optimize against an exogenous aggregate state to restore price-taking behavior, and recalibrates the RL reward structure to reflect true economic opportunity costs. By iteratively updating the aggregate state, our algorithm converges to a stationary fixed point that recovers the competitive equilibrium. This approach provides a method for embedding learning algorithms into dynamic general equilibrium models.
