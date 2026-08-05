---
title: "From Individual Learning to Market Equilibrium: Correcting Structural and Parametric Biases in RL Simulations of Economic Models"
collection: publications
category: workingpapers
permalink: /publication/computational
date: 2025-11-03
venue: 'Arxiv'
paperurl: 'https://arxiv.org/abs/2507.18229'
demourl: '/demos/computational/'
citation: 'Chen, Ruxin; Zhang, Zeqiang. (2025). &quot;From Individual Learning to Market Equilibrium: Correcting Structural and Parametric Biases in RL Simulations of Economic Models.&quot; <i>Arxiv</i>.'
---


The application of Reinforcement Learning (RL) to economic modeling reveals a fundamental conflict between the assumptions of equilibrium theory and the emergent behavior of learning agents. While canonical economic models assume atomistic agents act as "takers" of aggregate market conditions, a naive single-agent RL simulation incentivizes the agent to become a "manipulator" of its environment. We demonstrate this discrepancy within a search-and-matching model with concave production, showing that a standard RL agent learns a non-equilibrium, monopsonistic policy. Additionally, we identify a parametric bias arising from the mismatch between economic discounting and RL’s treatment of intertemporal costs. To address both issues, we propose a calibrated Mean-Field Reinforcement Learning framework that embeds a representative agent in a fixed macroeconomic field and adjusts the cost parameter to reflect economic opportunity costs. Our iterative algorithm converges to a self-consistent fixed point where the agent’s policy aligns with the competitive equilibrium. This approach provides a tractable and theoretically sound methodology for modeling learning agents in economic systems within the broader domain of computational social science.
