---
title: "Autonomous Learning From Success and Failure: Goal-Conditioned Supervised Learning with Negative Feedback"
collection: publications
category: workingpapers
permalink: /publication/gcsl_nf
date: 2025-09-03
venue: 'Arxiv'
paperurl: 'https://www.arxiv.org/abs/2509.03206'
demourl: '/demos/gcsl_nf/'
citation: 'Zhang, Zeqiang; Wurzberger, Fabian; Schmid, Gerrit; Gottwald, Sebastian; Braun, Daniel. (2025). &quot;Autonomous Learning From Success and Failure: Goal-Conditioned Supervised Learning with Negative Feedback.&quot; <i>Arxiv</i>.'
---
![Fig.](/images/gcsl_nf.png)


Reinforcement learning faces significant challenges when applied to tasks characterized by sparse reward structures. Although imitation learning, within the domain of supervised learning, offers faster convergence, it relies heavily on human-generated demonstrations. Recently, Goal-Conditioned Supervised Learning (GCSL) has emerged as a potential solution by enabling self-imitation learning for autonomous systems. By strategically relabelling goals, agents can derive policy insights from their own experiences. Despite the successes of this framework, it presents two notable limitations: (1) Learning exclusively from self-generated experiences can exacerbate the agents' inherent biases; (2) The relabelling strategy allows agents to focus solely on successful outcomes, precluding them from learning from their mistakes. To address these issues, we propose a novel model that integrates contrastive learning principles into the GCSL framework to learn from both success and failure. Through empirical evaluations, we demonstrate that our algorithm overcomes limitations imposed by agents' initial biases and thereby enables more exploratory behavior. This facilitates the identification and adoption of effective policies, leading to superior performance across a variety of challenging environments.
