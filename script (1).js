/**
 * FitMind AI — script.js
 * ============================================================
 * Core JavaScript for AI-Based Personalized Fitness Coach
 * Features:
 *  - Navbar scroll behavior + mobile menu
 *  - Dark/Light mode toggle
 *  - Intersection Observer scroll reveal
 *  - Activity slider live label
 *  - ML Classification Engine (rule-based simulation)
 *  - Generative AI Plan Engine (dynamic plan synthesis)
 *  - Form validation + submission flow
 *  - Plan day accordion
 *  - Weekly chart (Canvas API)
 *  - Download plan as text
 * ============================================================
 */

/* ── DOM Ready ──────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initTheme();
  initScrollReveal();
  initActivitySlider();
  initForm();
  initProgressTracker();   // replaces old initWeeklyChart
  initNavHighlight();
  initNutritionLogger();
});

/* ═══════════════════════════════════════════════════════════
   NAVBAR
═══════════════════════════════════════════════════════════ */
function initNavbar() {
  const navbar     = document.getElementById('navbar');
  const hamburger  = document.getElementById('hamburger');
  const navLinks   = document.getElementById('navLinks');

  // Scroll: add "scrolled" class
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  // Mobile hamburger toggle
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    navLinks.classList.toggle('open');
  });

  // Close menu on link click
  navLinks.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });
}

/* ── Active Nav Highlight on Scroll ──────────────────────── */
function initNavHighlight() {
  const sections = document.querySelectorAll('section[id]');
  const links    = document.querySelectorAll('.nav-link');

  const obs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(l => l.classList.remove('active'));
        const active = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
        if (active) active.classList.add('active');
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(s => obs.observe(s));
}

/* ═══════════════════════════════════════════════════════════
   THEME TOGGLE (Dark ↔ Light)
═══════════════════════════════════════════════════════════ */
function initTheme() {
  const toggle    = document.getElementById('themeToggle');
  const icon      = document.getElementById('themeIcon');
  const html      = document.documentElement;

  // Load saved preference
  const saved = localStorage.getItem('fitmind-theme') || 'dark';
  applyTheme(saved);

  toggle.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    applyTheme(current === 'dark' ? 'light' : 'dark');
  });

  function applyTheme(theme) {
    html.setAttribute('data-theme', theme);
    localStorage.setItem('fitmind-theme', theme);
    icon.className = theme === 'dark' ? 'ph ph-sun' : 'ph ph-moon';
    // Re-render weight chart with updated colors
    const logs = getProgressLogs();
    if (logs.length) renderWeightChart(logs);
  }
}

/* ═══════════════════════════════════════════════════════════
   SCROLL REVEAL
═══════════════════════════════════════════════════════════ */
function initScrollReveal() {
  const els = document.querySelectorAll('.reveal');
  const obs = new IntersectionObserver(entries => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger delay per sibling index
        setTimeout(() => entry.target.classList.add('visible'), i * 80);
        obs.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => obs.observe(el));
}

/* ═══════════════════════════════════════════════════════════
   ACTIVITY SLIDER LIVE LABEL
═══════════════════════════════════════════════════════════ */
const ACTIVITY_LABELS = ['Sedentary', 'Light Activity', 'Moderate Activity', 'Active', 'Very Active'];
const ACTIVITY_FACTORS = [1.2, 1.375, 1.55, 1.725, 1.9]; // for TDEE

function initActivitySlider() {
  const slider  = document.getElementById('activity');
  const display = document.getElementById('activityDisplay');
  if (!slider) return;

  const update = () => {
    display.textContent = ACTIVITY_LABELS[slider.value - 1];
  };
  slider.addEventListener('input', update);
  update();
}

/* ═══════════════════════════════════════════════════════════
   ML CLASSIFICATION ENGINE
   ─────────────────────────────────────────────────────────
   Simulates a rule-based ML model that classifies a user
   into: Beginner | Intermediate | Advanced
   Based on: BMI, age, activity level, goal
═══════════════════════════════════════════════════════════ */
function classifyFitnessLevel(data) {
  const { bmi, age, activity, goal } = data;

  let score = 0; // scoring model (0–10)

  /* ── Activity Level ─────────────────────────────── */
  // activity: 1=Sedentary → 5=Very Active
  score += (activity - 1) * 1.5; // 0 to 6

  /* ── BMI Factor ─────────────────────────────────── */
  // Healthy BMI range (18.5 – 24.9) is ideal
  if (bmi >= 18.5 && bmi <= 24.9) score += 2;
  else if (bmi >= 17 && bmi < 18.5) score += 1;
  else if (bmi > 24.9 && bmi <= 27) score += 1;
  else score += 0; // penalize extremes

  /* ── Age Factor ─────────────────────────────────── */
  if (age >= 18 && age <= 30) score += 2;
  else if (age > 30 && age <= 45) score += 1.5;
  else if (age > 45 && age <= 60) score += 1;
  else score += 0.5;

  /* ── Goal modifier ───────────────────────────────── */
  if (goal === 'muscle_gain' && activity >= 3) score += 0.5;
  if (goal === 'endurance' && activity >= 4)   score += 0.5;

  /* ── Classification Thresholds ───────────────────── */
  // Max possible score ≈ 10.5
  if (score >= 7)      return 'Advanced';
  if (score >= 4)      return 'Intermediate';
  return 'Beginner';
}

/* ═══════════════════════════════════════════════════════════
   HEALTH METRICS ENGINE
═══════════════════════════════════════════════════════════ */
function calculateMetrics(data) {
  const { age, weight, height, gender, activity, goal } = data;

  const heightM = height / 100;
  const bmi     = +(weight / (heightM * heightM)).toFixed(1);

  // BMI status
  let bmiStatus;
  if      (bmi < 18.5)       bmiStatus = 'Underweight';
  else if (bmi <= 24.9)      bmiStatus = 'Normal';
  else if (bmi <= 29.9)      bmiStatus = 'Overweight';
  else                       bmiStatus = 'Obese';

  // Mifflin–St Jeor BMR
  let bmr;
  if (gender === 'male') {
    bmr = Math.round(10 * weight + 6.25 * height - 5 * age + 5);
  } else {
    bmr = Math.round(10 * weight + 6.25 * height - 5 * age - 161);
  }

  // TDEE = BMR × Activity Factor
  const actFactor = ACTIVITY_FACTORS[activity - 1];
  const tdee      = Math.round(bmr * actFactor);

  // Caloric target based on goal
  let targetCalories;
  let calNote;
  switch (goal) {
    case 'weight_loss':
      targetCalories = Math.round(tdee * 0.80); // 20% deficit
      calNote = '−20% deficit';
      break;
    case 'muscle_gain':
      targetCalories = Math.round(tdee * 1.10); // 10% surplus
      calNote = '+10% surplus';
      break;
    case 'endurance':
      targetCalories = Math.round(tdee * 1.05);
      calNote = '+5% for endurance';
      break;
    default:
      targetCalories = tdee;
      calNote = 'maintenance';
  }

  return { bmi, bmiStatus, bmr, tdee, targetCalories, calNote };
}

/* ═══════════════════════════════════════════════════════════
   GENERATIVE AI WORKOUT PLAN ENGINE
   ─────────────────────────────────────────────────────────
   Dynamically synthesizes a full 7-day workout plan based
   on tier + goal + activity level. Simulates GenAI output.
═══════════════════════════════════════════════════════════ */
const EXERCISE_DB = {
  /* ── Push exercises ─── */
  push: {
    beginner:     [['Push-ups', '3×8'], ['Incline Push-ups', '3×10'], ['Tricep Dips', '2×10'], ['Shoulder Press (DB)', '3×8']],
    intermediate: [['Bench Press', '4×8'], ['Overhead Press', '3×10'], ['Tricep Pushdown', '3×12'], ['Lateral Raises', '3×12'], ['Dips', '3×10']],
    advanced:     [['Weighted Bench Press', '5×5'], ['Arnold Press', '4×10'], ['Weighted Dips', '4×8'], ['Cable Flyes', '3×15'], ['Close-grip Bench', '4×8']],
  },
  /* ── Pull exercises ─── */
  pull: {
    beginner:     [['Assisted Pull-ups', '3×5'], ['Dumbbell Rows', '3×10'], ['Face Pulls', '3×12'], ['Bicep Curls', '3×10']],
    intermediate: [['Pull-ups', '4×6'], ['Barbell Rows', '4×8'], ['Lat Pulldown', '3×12'], ['Hammer Curls', '3×12'], ['Seated Rows', '3×10']],
    advanced:     [['Weighted Pull-ups', '5×5'], ['T-Bar Rows', '4×8'], ['Pendlay Rows', '4×6'], ['Incline DB Curls', '4×10'], ['Face Pulls', '4×15']],
  },
  /* ── Legs exercises ─── */
  legs: {
    beginner:     [['Bodyweight Squats', '3×12'], ['Lunges', '3×10 each'], ['Glute Bridges', '3×15'], ['Calf Raises', '3×20']],
    intermediate: [['Back Squats', '4×8'], ['Romanian Deadlift', '3×10'], ['Leg Press', '3×12'], ['Walking Lunges', '3×12'], ['Calf Raises', '4×20']],
    advanced:     [['Heavy Back Squats', '5×5'], ['Deadlifts', '4×5'], ['Bulgarian Split Squats', '4×8'], ['Leg Curls', '3×12'], ['Box Jumps', '4×8']],
  },
  /* ── Core exercises ─── */
  core: {
    beginner:     [['Plank', '3×20s'], ['Crunches', '3×15'], ['Leg Raises', '3×10'], ['Dead Bug', '3×8']],
    intermediate: [['Plank', '3×45s'], ['Russian Twists', '3×20'], ['Hanging Knee Raises', '3×12'], ['Ab Wheel', '3×10'], ['Cable Crunches', '3×15']],
    advanced:     [['Dragon Flag', '3×6'], ['Hanging Leg Raises', '4×15'], ['Ab Wheel Rollouts', '4×12'], ['Pallof Press', '3×12'], ['L-Sit Holds', '3×15s']],
  },
  /* ── Cardio ─── */
  cardio: {
    beginner:     [['Brisk Walk', '20 min'], ['Cycling (easy)', '15 min'], ['Jump Rope', '3×1 min']],
    intermediate: [['Jogging', '25 min'], ['Cycling (moderate)', '20 min'], ['HIIT Intervals', '20 min']],
    advanced:     [['Tempo Run', '30 min'], ['Rowing Machine', '20 min'], ['Tabata HIIT', '25 min'], ['Sprints', '10×30s']],
  },
  /* ── Flexibility / Mobility ─── */
  flex: {
    beginner:     [['Full Body Stretch', '15 min'], ['Cat-Cow Stretch', '3×10'], ['Hip Flexor Stretch', '2×30s each'], ['Child\'s Pose', '3×30s']],
    intermediate: [['Yoga Flow', '20 min'], ['Foam Rolling', '10 min'], ['PNF Stretching', '15 min'], ['Hip Mobility Drills', '10 min']],
    advanced:     [['Advanced Yoga', '30 min'], ['Loaded Stretching', '20 min'], ['Fascial Release', '15 min'], ['Active Mobility Flow', '20 min']],
  },
};

/* Calorie burn estimates per workout type (kcal) */
const CALORIE_ESTIMATES = {
  push:    { beginner: 180, intermediate: 260, advanced: 360 },
  pull:    { beginner: 170, intermediate: 250, advanced: 340 },
  legs:    { beginner: 220, intermediate: 320, advanced: 430 },
  core:    { beginner: 130, intermediate: 180, advanced: 230 },
  cardio:  { beginner: 200, intermediate: 310, advanced: 420 },
  flex:    { beginner:  80, intermediate: 110, advanced: 140 },
  rest:    { beginner:   0, intermediate:   0, advanced:   0 },
};

/* Day templates per goal */
const PLAN_TEMPLATES = {
  weight_loss:  ['cardio', 'push', 'cardio', 'pull', 'cardio', 'legs', 'flex'],
  muscle_gain:  ['push',   'pull', 'legs', 'rest', 'push',   'pull', 'legs'],
  maintenance:  ['push',   'cardio', 'legs', 'flex', 'pull',   'cardio', 'rest'],
  endurance:    ['cardio', 'flex', 'cardio', 'core', 'cardio', 'legs', 'rest'],
  flexibility:  ['flex',   'core', 'flex',   'cardio','flex',  'core', 'rest'],
};

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * Generates a complete 7-day workout plan
 * @param {string} tier   - 'beginner' | 'intermediate' | 'advanced'
 * @param {string} goal   - goal key
 * @returns {Array}       - array of 7 day objects
 */
function generateWorkoutPlan(tier, goal) {
  const tierKey   = tier.toLowerCase();
  const template  = PLAN_TEMPLATES[goal] || PLAN_TEMPLATES['maintenance'];

  return DAY_NAMES.map((dayName, i) => {
    const type  = template[i];
    const isRest = type === 'rest';

    const exercises = isRest
      ? []
      : (EXERCISE_DB[type]?.[tierKey] || []).map(([name, detail]) => ({ name, detail }));

    const kcal = isRest ? 0 : (CALORIE_ESTIMATES[type]?.[tierKey] || 200);

    return {
      day:       dayName,
      type:      isRest ? 'Rest & Recovery' : capitalize(type),
      exercises,
      kcal,
      isRest,
    };
  });
}

/* ── AI Coaching Tips Generator ──────────────────────────── */
function generateTips(tier, goal, metrics) {
  const tipsPool = {
    weight_loss: [
      '🥗 Aim for a protein intake of 1.6–2.0g per kg of bodyweight to preserve muscle while in a caloric deficit.',
      '💧 Drinking 500ml of water before meals can reduce calorie intake by 13% on average.',
      `🔥 Your estimated daily caloric target is ${metrics.targetCalories} kcal (${metrics.calNote}).`,
      '⏱ Consider intermittent fasting (16:8) to naturally reduce your eating window.',
      '🚶 Adding 3,000 extra steps daily burns an additional ~150 kcal with minimal effort.',
    ],
    muscle_gain: [
      '💪 Progressive overload is key — aim to increase weight or reps each week.',
      '🥩 Target 0.7–1g of protein per pound of bodyweight daily for optimal muscle synthesis.',
      `⚡ Your caloric surplus target is ${metrics.targetCalories} kcal/day — prioritize nutrient-dense foods.`,
      '😴 Muscles grow during sleep — aim for 7–9 hours of quality rest each night.',
      '🔄 Compound movements (squat, bench, deadlift) produce the highest hormonal response.',
    ],
    maintenance: [
      '⚖️ Consistency over intensity — showing up regularly matters more than perfect workouts.',
      `📊 Your TDEE is ${metrics.tdee} kcal/day — this is your maintenance calorie target.`,
      '🏃 Mix cardio and strength training 3:2 for optimal body composition maintenance.',
      '🧘 Don\'t neglect mobility work — 10 minutes of stretching daily prevents injuries.',
      '📈 Track your workouts to identify plateaus and adjust your plan every 4 weeks.',
    ],
    endurance: [
      '🏃 Build base mileage gradually — follow the 10% rule (increase weekly volume by no more than 10%).',
      '💧 Pre-hydrate with 500ml 2 hours before long training sessions.',
      `⚡ Carbohydrates are your fuel — target ${Math.round(metrics.targetCalories * 0.55 / 4)}g of carbs daily.`,
      '🫀 Zone 2 cardio (60–70% max HR) builds your aerobic base most efficiently.',
      '🦵 Strength training 2x/week improves running economy by up to 8%.',
    ],
    flexibility: [
      '🧘 Consistency is key — 15 minutes of daily stretching beats 2 hours once a week.',
      '🌡️ Always warm up before deep stretching — cold muscles tear easily.',
      '⏳ Hold each stretch for 30–45 seconds for genuine flexibility gains.',
      '🌬️ Use controlled breathing during stretches — exhale into each stretch.',
      '💆 Foam rolling breaks up fascial adhesions and speeds muscle recovery.',
    ],
  };

  const tierTips = {
    Beginner:     '🌱 As a beginner, focus on form over weight. Master the movement patterns before adding load.',
    Intermediate: '📈 At the intermediate level, periodization is your best friend. Vary intensity every 3–4 weeks.',
    Advanced:     '🏆 Advanced training demands deload weeks every 4–6 weeks to prevent overtraining syndrome.',
  };

  const base = tipsPool[goal] || tipsPool['maintenance'];
  return [tierTips[tier], ...base.slice(0, 4)];
}

/* ═══════════════════════════════════════════════════════════
   FORM VALIDATION
═══════════════════════════════════════════════════════════ */
function validateForm() {
  let valid = true;

  const age     = +document.getElementById('age').value;
  const weight  = +document.getElementById('weight').value;
  const height  = +document.getElementById('height').value;
  const gender  = document.getElementById('gender').value;
  const goal    = document.querySelector('input[name="goal"]:checked')?.value;

  // Clear previous errors
  ['age','weight','height','goal'].forEach(id => {
    const el = document.getElementById(id + 'Error');
    if (el) el.textContent = '';
  });

  if (!age || age < 10 || age > 90) {
    document.getElementById('ageError').textContent = 'Please enter a valid age (10–90).';
    valid = false;
  }
  if (!weight || weight < 30 || weight > 250) {
    document.getElementById('weightError').textContent = 'Please enter a valid weight (30–250 kg).';
    valid = false;
  }
  if (!height || height < 100 || height > 250) {
    document.getElementById('heightError').textContent = 'Please enter a valid height (100–250 cm).';
    valid = false;
  }
  if (!goal) {
    document.getElementById('goalError').textContent = 'Please select a fitness goal.';
    valid = false;
  }
  if (!gender) {
    valid = false; // gender selector will be visually highlighted
  }

  return valid;
}

/* ═══════════════════════════════════════════════════════════
   FORM SUBMIT — Main Pipeline
═══════════════════════════════════════════════════════════ */
function initForm() {
  const form      = document.getElementById('fitnessForm');
  const submitBtn = document.getElementById('submitBtn');
  const btnText   = document.getElementById('btnText');
  const btnLoader = document.getElementById('btnLoader');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    // ── Collect form data ─────────────────────────
    const age      = +document.getElementById('age').value;
    const weight   = +document.getElementById('weight').value;
    const height   = +document.getElementById('height').value;
    const gender   = document.getElementById('gender').value;
    const activity = +document.getElementById('activity').value;
    const goal     = document.querySelector('input[name="goal"]:checked').value;
    const name     = document.getElementById('name').value.trim() || 'Athlete';

    const heightM = height / 100;
    const bmi     = +(weight / (heightM * heightM)).toFixed(1);
    const data    = { age, weight, height, gender, activity, goal, bmi };

    // ── Loading state ─────────────────────────────
    submitBtn.disabled = true;
    btnText.textContent = 'Analyzing…';
    btnLoader.classList.add('active');

    // ── Step 1: ML Classification (simulated 1.2s delay) ─
    await delay(1200);
    const tier = classifyFitnessLevel(data);

    // ── Step 2: Compute health metrics ───────────
    const metrics = calculateMetrics(data);

    // ── Show output panel ─────────────────────────
    renderProfileHeader(name, tier);
    renderMetrics(metrics);
    showOutputPanel();

    // ── Step 3: GenAI Plan Generation (simulated) ─
    btnText.textContent = 'Generating Plan…';
    await delay(1800);

    const plan = generateWorkoutPlan(tier, goal);
    const tips = generateTips(tier, goal, metrics);

    // ── Render everything ─────────────────────────
    renderWorkoutPlan(plan, tier);
    renderTips(tips);
    renderCalorieBars(plan);
    renderDailyNutrition(metrics, goal);

    // ── Reset button ─────────────────────────────
    submitBtn.disabled = false;
    btnText.textContent = 'Regenerate Plan';
    btnLoader.classList.remove('active');

    // ── Store plan for download ───────────────────
    window._lastPlan = { name, tier, metrics, plan, tips };
    window._lastBiometrics = { age, weight, height, gender, activity, goal };

    // ── Scroll to output ──────────────────────────
    document.getElementById('outputPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ── Download button ───────────────────────────
  document.getElementById('downloadBtn')?.addEventListener('click', downloadPlan);
}

/* ── Render helpers ─────────────────────────────────────── */

function showOutputPanel() {
  document.getElementById('outputPlaceholder').style.display = 'none';
  document.getElementById('outputContent').style.display = 'block';
  document.getElementById('aiGenerating').style.display = 'flex';
  document.getElementById('workoutPlan').style.display  = 'none';
  document.getElementById('tipsSection').style.display  = 'none';
  document.getElementById('calorieSection').style.display = 'none';
}

function renderProfileHeader(name, tier) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('outputAvatar').textContent = initials;
  document.getElementById('outputName').textContent   = name;

  const badge = document.getElementById('tierBadge');
  badge.textContent  = tier;
  badge.className    = `tier-badge tier-${tier.toLowerCase()}`;
}

function renderMetrics(m) {
  document.getElementById('metBMI').textContent       = m.bmi;
  document.getElementById('metBMIStatus').textContent  = m.bmiStatus;
  document.getElementById('metBMR').textContent       = m.bmr.toLocaleString();
  document.getElementById('metTDEE').textContent      = m.tdee.toLocaleString();
  document.getElementById('metTarget').textContent    = m.targetCalories.toLocaleString();
}

function renderWorkoutPlan(plan, tier) {
  // Hide AI generating indicator
  document.getElementById('aiGenerating').style.display = 'none';

  const container = document.getElementById('planDays');
  container.innerHTML = '';

  plan.forEach((day, i) => {
    const div = document.createElement('div');
    div.className = 'plan-day';

    div.innerHTML = `
      <div class="plan-day-header">
        <span class="day-name">${day.day}</span>
        <span class="day-type">${day.type}</span>
        ${day.isRest ? '' : `<span class="day-kcal">~${day.kcal} kcal</span>`}
        <i class="ph ph-caret-down day-toggle"></i>
      </div>
      <div class="plan-day-body">
        ${day.isRest
          ? `<p class="rest-day-text">🛌 Complete rest or light 20-min walk. Let your body recover and grow.</p>`
          : `<div class="day-exercises">
              ${day.exercises.map(ex => `
                <div class="ex-row">
                  <span class="ex-name">${ex.name}</span>
                  <span class="ex-detail">${ex.detail}</span>
                </div>
              `).join('')}
             </div>`
        }
      </div>
    `;

    // Accordion toggle
    div.querySelector('.plan-day-header').addEventListener('click', () => {
      div.classList.toggle('open');
    });

    // Auto-open first active day
    if (i === 0) div.classList.add('open');

    container.appendChild(div);
  });

  document.getElementById('workoutPlan').style.display = 'block';
}

function renderTips(tips) {
  const list = document.getElementById('tipsList');
  list.innerHTML = tips.map(t => `<li>${t}</li>`).join('');
  document.getElementById('tipsSection').style.display = 'block';
}

function renderCalorieBars(plan) {
  const container = document.getElementById('calorieBars');
  const maxKcal   = Math.max(...plan.map(d => d.kcal), 100);

  container.innerHTML = plan.map(d => `
    <div class="cal-bar-wrap">
      <span class="cal-val">${d.kcal > 0 ? d.kcal : '—'}</span>
      <div class="cal-bar" style="height:${(d.kcal / maxKcal) * 60}px"></div>
      <span class="cal-day-lbl">${d.day.slice(0,3)}</span>
    </div>
  `).join('');

  document.getElementById('calorieSection').style.display = 'block';
}

/* ── Download Plan ───────────────────────────────────────── */
function downloadPlan() {
  const p = window._lastPlan;
  if (!p) return;

  const lines = [
    '╔══════════════════════════════════════════════╗',
    '║         FITMIND AI — PERSONALIZED PLAN        ║',
    '╚══════════════════════════════════════════════╝',
    '',
    `Name    : ${p.name}`,
    `Level   : ${p.tier}`,
    `BMI     : ${p.metrics.bmi} (${p.metrics.bmiStatus})`,
    `BMR     : ${p.metrics.bmr} kcal/day`,
    `TDEE    : ${p.metrics.tdee} kcal/day`,
    `Target  : ${p.metrics.targetCalories} kcal/day`,
    '',
    '══════════════ WEEKLY WORKOUT PLAN ══════════════',
    '',
    ...p.plan.flatMap(d => [
      `📅 ${d.day.toUpperCase()} — ${d.type}${d.isRest ? '' : ` (~${d.kcal} kcal)`}`,
      d.isRest
        ? '   Rest & Recovery Day'
        : d.exercises.map(e => `   • ${e.name} — ${e.detail}`).join('\n'),
      '',
    ]),
    '══════════════════ AI TIPS ═══════════════════════',
    '',
    ...p.tips.map(t => `  ${t}`),
    '',
    '─────────────────────────────────────────────────',
    'Generated by FitMind AI | Academic Project',
    'Note: Plans are for educational/demonstration purposes.',
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), {
    href: url,
    download: `FitMindAI_Plan_${p.name.replace(/\s+/g, '_')}.txt`,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ═══════════════════════════════════════════════════════════
   PROGRESS TRACKER — localStorage-backed, user-driven
   ─────────────────────────────────────────────────────────
   All data comes from user input. Nothing is fake/random.
   Stores entries in localStorage as JSON array.
   Chart uses Chart.js (CDN) with real weight-over-time data.
═══════════════════════════════════════════════════════════ */

/* localStorage key */
const PROGRESS_KEY = 'fitmind_progress_logs';

/* Chart.js instance reference */
let weightChartInstance = null;

/* Achievement definitions — unlocked from real data */
const ACHIEVEMENTS = [
  { id: 'first_log',     emoji: '🌱', label: 'First Log',    desc: 'Log your first day',           check: (logs) => logs.length >= 1 },
  { id: 'three_days',    emoji: '🔥', label: '3-Day Streak', desc: '3 consecutive logged days',    check: (logs, streak) => streak >= 3 },
  { id: 'week_streak',   emoji: '🏅', label: 'Week Streak',  desc: '7 days in a row',              check: (logs, streak) => streak >= 7 },
  { id: 'ten_workouts',  emoji: '💪', label: '10 Workouts',  desc: 'Complete 10 workouts',         check: (logs) => logs.filter(l => l.workoutDone === 'yes').length >= 10 },
  { id: 'steps_10k',     emoji: '👟', label: '10K Steps',    desc: 'Log 10,000+ steps in a day',   check: (logs) => logs.some(l => +l.steps >= 10000) },
  { id: 'hydration',     emoji: '💧', label: 'Hydrated',     desc: '3L+ water in a day',           check: (logs) => logs.some(l => +l.water >= 3) },
  { id: 'early_riser',   emoji: '🌅', label: 'Early Riser',  desc: '8+ hrs sleep logged',          check: (logs) => logs.some(l => +l.sleep >= 8) },
  { id: 'iron_will',     emoji: '🏆', label: 'Iron Will',    desc: '30 total workouts done',       check: (logs) => logs.filter(l => l.workoutDone === 'yes').length >= 30 },
];

/* ── Init ─────────────────────────────────────────────────── */
function initProgressTracker() {
  /* Set today's date in form */
  const dateEl = document.getElementById('logDate');
  if (dateEl) dateEl.value = todayISO();

  /* Set display dates */
  const dlcDate = document.getElementById('dlcDate');
  if (dlcDate) dlcDate.textContent = new Date().toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short' });

  const goalsDate = document.getElementById('goalsDate');
  if (goalsDate) goalsDate.textContent = new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });

  /* Form submit */
  document.getElementById('progressForm')?.addEventListener('submit', handleProgressSubmit);

  /* Reset form button */
  document.getElementById('logResetBtn')?.addEventListener('click', () => {
    document.getElementById('progressForm').reset();
    document.getElementById('logDate').value = todayISO();
    document.getElementById('logSuccess').style.display = 'none';
  });

  /* Clear all history */
  document.getElementById('clearHistoryBtn')?.addEventListener('click', () => {
    if (!confirm('Delete all logged entries? This cannot be undone.')) return;
    localStorage.removeItem(PROGRESS_KEY);
    refreshProgressDashboard();
  });

  /* Initial render from saved data */
  refreshProgressDashboard();
}

/* ── Handle form submit ───────────────────────────────────── */
function handleProgressSubmit(e) {
  e.preventDefault();

  const entry = {
    id:          Date.now(),
    date:        document.getElementById('logDate').value || todayISO(),
    weight:      parseFloat(document.getElementById('logWeight').value) || null,
    steps:       parseInt(document.getElementById('logSteps').value)    || 0,
    calsBurned:  parseInt(document.getElementById('logCalsBurned').value) || 0,
    duration:    parseInt(document.getElementById('logDuration').value)  || 0,
    water:       parseFloat(document.getElementById('logWater').value)   || 0,
    sleep:       parseFloat(document.getElementById('logSleep').value)   || 0,
    workoutDone: document.querySelector('input[name="workoutDone"]:checked')?.value || 'no',
    notes:       document.getElementById('logNotes').value.trim(),
  };

  /* Load existing logs, remove duplicate for same date, push new */
  const logs = getProgressLogs();
  const filtered = logs.filter(l => l.date !== entry.date);
  filtered.push(entry);
  filtered.sort((a, b) => a.date.localeCompare(b.date));
  saveProgressLogs(filtered);

  /* Show success, refresh dashboard */
  const successEl = document.getElementById('logSuccess');
  successEl.style.display = 'flex';
  setTimeout(() => { successEl.style.display = 'none'; }, 3000);

  refreshProgressDashboard();
}

/* ── Full dashboard refresh ───────────────────────────────── */
function refreshProgressDashboard() {
  const logs = getProgressLogs();

  renderLogTable(logs);
  renderStatCards(logs);
  renderTodayGoals(logs);
  renderWeightChart(logs);
  renderAchievements(logs);
}

/* ── Render history table ─────────────────────────────────── */
function renderLogTable(logs) {
  const tbody   = document.getElementById('logTableBody');
  const emptyRow = document.getElementById('lhEmptyRow');
  if (!tbody) return;

  /* Remove all data rows (keep the empty-row template) */
  tbody.querySelectorAll('.lh-data-row').forEach(r => r.remove());

  if (!logs.length) {
    if (emptyRow) emptyRow.style.display = '';
    return;
  }
  if (emptyRow) emptyRow.style.display = 'none';

  /* Show most recent first */
  [...logs].reverse().forEach(log => {
    const tr = document.createElement('tr');
    tr.className = 'lh-data-row';

    const wkClass = log.workoutDone === 'yes'  ? 'tbl-workout-yes'
                  : log.workoutDone === 'rest' ? 'tbl-workout-rest'
                  : 'tbl-workout-no';
    const wkLabel = log.workoutDone === 'yes'  ? '✅ Yes'
                  : log.workoutDone === 'rest' ? '😴 Rest'
                  : '❌ No';

    tr.innerHTML = `
      <td>${formatDateShort(log.date)}</td>
      <td>${log.weight ? log.weight + ' kg' : '—'}</td>
      <td>${log.steps ? log.steps.toLocaleString() : '—'}</td>
      <td>${log.calsBurned ? log.calsBurned : '—'}</td>
      <td>${log.water ? log.water + 'L' : '—'}</td>
      <td>${log.sleep ? log.sleep + 'h' : '—'}</td>
      <td class="${wkClass}">${wkLabel}</td>
      <td>
        <button class="tbl-del-btn" data-id="${log.id}" title="Delete entry">
          <i class="ph ph-x"></i>
        </button>
      </td>
    `;

    /* Delete button */
    tr.querySelector('.tbl-del-btn').addEventListener('click', () => {
      const updated = getProgressLogs().filter(l => l.id !== log.id);
      saveProgressLogs(updated);
      refreshProgressDashboard();
    });

    tbody.appendChild(tr);
  });
}

/* ── Render summary stat cards ────────────────────────────── */
function renderStatCards(logs) {
  const streak   = calcStreak(logs);
  const workouts = logs.filter(l => l.workoutDone === 'yes').length;
  const totalMin = logs.reduce((s, l) => s + (l.duration || 0), 0);
  const totalKcal = logs.reduce((s, l) => s + (l.calsBurned || 0), 0);

  setEl('statStreak',   streak);
  setEl('statWorkouts', workouts);
  setEl('statTime',     totalMin >= 60 ? (totalMin / 60).toFixed(1) + 'h' : totalMin + 'm');
  setEl('statKcal',     totalKcal >= 1000 ? (totalKcal / 1000).toFixed(1) + 'k' : totalKcal);
}

/* ── Render today's goal progress bars ────────────────────── */
function renderTodayGoals(logs) {
  const today = logs.find(l => l.date === todayISO()) || null;

  const steps    = today?.steps       || 0;
  const cals     = today?.calsBurned  || 0;
  const water    = today?.water       || 0;
  const sleep    = today?.sleep       || 0;
  const duration = today?.duration    || 0;

  /* Calorie goal: from AI plan if available, else 300 */
  const calGoal = window._nutritionGoalKcal
    ? Math.round(window._nutritionGoalKcal * 0.15)   // ~15% of TDEE as burn goal
    : 300;

  setEl('gpSteps',    steps.toLocaleString());
  setEl('gpCals',     cals);
  setEl('gpWater',    water);
  setEl('gpSleep',    sleep);
  setEl('gpDuration', duration);
  setEl('gpCalsGoal', calGoal);

  setGoalBar('gpStepsBar',    'gpStepsPct',    steps,    10000);
  setGoalBar('gpCalsBar',     'gpCalsPct',     cals,     calGoal);
  setGoalBar('gpWaterBar',    'gpWaterPct',    water,    2.5);
  setGoalBar('gpSleepBar',    'gpSleepPct',    sleep,    8);
  setGoalBar('gpDurationBar', 'gpDurationPct', duration, 45);

  const noteEl = document.getElementById('goalsNote');
  if (noteEl) {
    noteEl.style.display = today ? 'none' : 'block';
  }
}

/* ── Render weight chart via Chart.js ─────────────────────── */
function renderWeightChart(logs) {
  const canvas  = document.getElementById('weeklyChart');
  const emptyMsg = document.getElementById('chartEmptyMsg');
  if (!canvas || !emptyMsg) return;

  /* Filter only entries that have weight */
  const withWeight = logs.filter(l => l.weight != null && !isNaN(l.weight));

  if (withWeight.length === 0) {
    canvas.style.display   = 'none';
    emptyMsg.style.display = 'flex';
    if (weightChartInstance) { weightChartInstance.destroy(); weightChartInstance = null; }
    return;
  }

  emptyMsg.style.display = 'none';
  canvas.style.display   = 'block';

  const labels = withWeight.map(l => formatDateShort(l.date));
  const data   = withWeight.map(l => l.weight);

  const isDark  = document.documentElement.getAttribute('data-theme') !== 'light';
  const gridCol = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
  const textCol = isDark ? 'rgba(160,160,192,0.8)'  : 'rgba(71,85,105,0.9)';

  /* Destroy old instance before recreating */
  if (weightChartInstance) { weightChartInstance.destroy(); weightChartInstance = null; }

  weightChartInstance = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Weight (kg)',
        data,
        borderColor:     '#00f5d4',
        backgroundColor: 'rgba(0,245,212,0.08)',
        pointBackgroundColor: '#00f5d4',
        pointBorderColor:     '#07070f',
        pointRadius:     5,
        pointHoverRadius: 7,
        borderWidth:     2.5,
        tension:         0.35,
        fill:            true,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#1a1a2e' : '#ffffff',
          titleColor:      isDark ? '#f0f0ff' : '#0f172a',
          bodyColor:       isDark ? '#a0a0c0' : '#475569',
          borderColor:     '#00f5d4',
          borderWidth:     1,
          callbacks: {
            label: ctx => ` ${ctx.parsed.y} kg`,
          }
        }
      },
      scales: {
        x: {
          ticks:  { color: textCol, font: { family: 'JetBrains Mono', size: 10 } },
          grid:   { color: gridCol },
        },
        y: {
          ticks:  { color: textCol, font: { family: 'JetBrains Mono', size: 10 }, callback: v => v + ' kg' },
          grid:   { color: gridCol },
        }
      }
    }
  });
}

/* ── Render achievement badges from real data ─────────────── */
function renderAchievements(logs) {
  const grid = document.getElementById('achGrid');
  if (!grid) return;

  const streak = calcStreak(logs);

  grid.innerHTML = ACHIEVEMENTS.map(ach => {
    const unlocked = ach.check(logs, streak);
    return `
      <div class="ach-badge ${unlocked ? 'unlocked' : ''}" title="${ach.desc}">
        ${ach.emoji}
        <span>${ach.label}</span>
      </div>
    `;
  }).join('');
}

/* ── localStorage helpers ─────────────────────────────────── */
function getProgressLogs() {
  try {
    return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '[]');
  } catch { return []; }
}
function saveProgressLogs(logs) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(logs));
}

/* ── Streak calculator ────────────────────────────────────── */
function calcStreak(logs) {
  if (!logs.length) return 0;
  const dates = [...new Set(logs.map(l => l.date))].sort();
  let streak  = 1;
  let max     = 1;
  for (let i = 1; i < dates.length; i++) {
    const diff = daysDiff(dates[i - 1], dates[i]);
    if (diff === 1) { streak++; max = Math.max(max, streak); }
    else { streak = 1; }
  }
  /* Only count streak if most recent log is today or yesterday */
  const last   = dates[dates.length - 1];
  const today  = todayISO();
  const diffToToday = daysDiff(last, today);
  return diffToToday <= 1 ? max : 0;
}

/* ── Date utilities ───────────────────────────────────────── */
function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function formatDateShort(iso) {
  const [y, m, d] = iso.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${months[+m - 1]}`;
}
function daysDiff(isoA, isoB) {
  return Math.round((new Date(isoB) - new Date(isoA)) / 86400000);
}

/* ── DOM helpers ──────────────────────────────────────────── */
function setGoalBar(barId, pctId, val, max) {
  const pct  = Math.min(Math.round((val / max) * 100), 100);
  const barEl = document.getElementById(barId);
  const pctEl = document.getElementById(pctId);
  if (barEl) barEl.style.setProperty('--w', pct + '%');
  if (pctEl) pctEl.textContent = pct + '%';
}

/* Also re-render chart when theme changes (colors need update) */
const _origApplyTheme = window._applyThemeFn;


/* ── Utility ─────────────────────────────────────────────── */
const delay = ms => new Promise(r => setTimeout(r, ms));
const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

/* ═══════════════════════════════════════════════════════════
   DAILY NUTRITION TARGETS (shown in output panel)
   ─────────────────────────────────────────────────────────
   Calculates macro & micronutrient targets based on
   goal, weight, and caloric target from metrics.
═══════════════════════════════════════════════════════════ */

/**
 * Compute daily macro targets in grams
 * Uses standard sports-nutrition split ratios per goal.
 */
function computeDailyNutritionTargets(metrics, goal, weight) {
  const kcal = metrics.targetCalories;

  // Macro split ratios (protein%, carb%, fat%) per goal
  const splits = {
    weight_loss:  { p: 0.35, c: 0.35, f: 0.30 },
    muscle_gain:  { p: 0.30, c: 0.45, f: 0.25 },
    maintenance:  { p: 0.25, c: 0.50, f: 0.25 },
    endurance:    { p: 0.20, c: 0.55, f: 0.25 },
    flexibility:  { p: 0.25, c: 0.45, f: 0.30 },
  };
  const split = splits[goal] || splits['maintenance'];

  // Calories per gram: protein=4, carb=4, fat=9
  const proteinG = Math.round((kcal * split.p) / 4);
  const carbsG   = Math.round((kcal * split.c) / 4);
  const fatG     = Math.round((kcal * split.f) / 9);

  // Fiber: 14g per 1000 kcal (DRI guideline)
  const fiberG = Math.round((kcal / 1000) * 14);

  // Sugar: max 10% of kcal from free sugars (WHO)
  const sugarG = Math.round((kcal * 0.10) / 4);

  // Water: 35ml/kg body weight
  const waterMl = Math.round(weight * 35);

  // Micronutrient RDAs (simplified averages)
  const sodium  = 2300; // mg
  const calcium = 1000; // mg
  const iron    = goal === 'endurance' ? 18 : 14; // mg (higher for endurance)
  const vitC    = 90;   // mg

  return { proteinG, carbsG, fatG, fiberG, sugarG, waterMl, sodium, calcium, iron, vitC };
}

/**
 * Renders the Daily Nutrition Targets panel inside the output panel
 */
function renderDailyNutrition(metrics, goal) {
  const targets = computeDailyNutritionTargets(metrics, goal, window._lastBiometrics?.weight || 70);

  // Store globally so logger can use them
  window._nutritionTargets = targets;
  window._nutritionGoalKcal = metrics.targetCalories;

  const goalLabels = {
    weight_loss: 'Weight Loss · High Protein, Moderate Carb, Moderate Fat',
    muscle_gain: 'Muscle Gain · High Protein, High Carb, Low Fat',
    maintenance: 'Maintenance · Balanced Macros',
    endurance:   'Endurance · High Carb, Moderate Protein',
    flexibility: 'Flexibility · Balanced + Anti-inflammatory fats',
  };

  document.getElementById('dnSubtitle').textContent = goalLabels[goal] || '';

  const macros = [
    { label: 'Calories',  val: `${metrics.targetCalories} kcal`, note: metrics.calNote,        cls: 'cal-item'     },
    { label: 'Protein',   val: `${targets.proteinG}g`,           note: `${Math.round(targets.proteinG / (window._lastBiometrics?.weight || 70) * 10)/10}g/kg`, cls: 'protein-item' },
    { label: 'Carbs',     val: `${targets.carbsG}g`,             note: '4 kcal/g',              cls: 'carb-item'    },
    { label: 'Fat',       val: `${targets.fatG}g`,               note: '9 kcal/g',              cls: 'fat-item'     },
    { label: 'Fiber',     val: `${targets.fiberG}g`,             note: '14g / 1000 kcal',       cls: 'fiber-item'   },
    { label: 'Water',     val: `${(targets.waterMl/1000).toFixed(1)}L`, note: '35ml/kg weight', cls: 'water-item'   },
  ];

  document.getElementById('dnMacroGrid').innerHTML = macros.map(m => `
    <div class="dn-macro-item ${m.cls}">
      <div class="dn-macro-val">${m.val}</div>
      <div class="dn-macro-label">${m.label}</div>
      <div class="dn-macro-note">${m.note}</div>
    </div>
  `).join('');

  document.getElementById('dnMicroRow').innerHTML = [
    `Sodium ≤${targets.sodium}mg`,
    `Calcium ${targets.calcium}mg`,
    `Iron ${targets.iron}mg`,
    `Vit-C ${targets.vitC}mg`,
    `Sugar ≤${targets.sugarG}g`,
  ].map(t => `<span class="dn-micro-chip">${t}</span>`).join('');

  document.getElementById('dailyNutrition').style.display = 'block';

  // Update logger goal bars if already initialized
  updateMacroBars();
}

/* ═══════════════════════════════════════════════════════════
   FOOD DATABASE
   ─────────────────────────────────────────────────────────
   ~80 common foods. Per 100g unless noted (unit foods).
   Fields: name, category, unit, kcal, protein, carbs, fat,
           fiber, sugar, sodium, calcium, iron, vitC
═══════════════════════════════════════════════════════════ */
const FOOD_DB = [
  // ── Grains & Carbs ──────────────────────────────────────
  { name:'White Rice (cooked)',  cat:'Grains',   unit:'g',  kcal:130, protein:2.7, carbs:28.2, fat:0.3, fiber:0.4, sugar:0.1, sodium:1,   calcium:10,  iron:0.2, vitC:0   },
  { name:'Brown Rice (cooked)', cat:'Grains',    unit:'g',  kcal:123, protein:2.7, carbs:25.6, fat:0.9, fiber:1.8, sugar:0.4, sodium:1,   calcium:10,  iron:0.5, vitC:0   },
  { name:'Oats (dry)',          cat:'Grains',    unit:'g',  kcal:389, protein:17,  carbs:66,   fat:7,   fiber:11,  sugar:1,   sodium:2,   calcium:54,  iron:4.7, vitC:0   },
  { name:'Whole Wheat Bread',   cat:'Grains',    unit:'g',  kcal:247, protein:13,  carbs:41,   fat:4.2, fiber:7,   sugar:5,   sodium:472, calcium:161, iron:3.6, vitC:0   },
  { name:'White Bread',         cat:'Grains',    unit:'g',  kcal:265, protein:9,   carbs:49,   fat:3.2, fiber:2.7, sugar:5,   sodium:491, calcium:151, iron:3.6, vitC:0   },
  { name:'Chapati / Roti',      cat:'Grains',    unit:'g',  kcal:297, protein:9.8, carbs:54,   fat:5.3, fiber:4.4, sugar:1,   sodium:328, calcium:26,  iron:2.7, vitC:0   },
  { name:'Pasta (cooked)',      cat:'Grains',    unit:'g',  kcal:131, protein:5,   carbs:25,   fat:1.1, fiber:1.8, sugar:0.6, sodium:1,   calcium:7,   iron:0.5, vitC:0   },
  { name:'Quinoa (cooked)',     cat:'Grains',    unit:'g',  kcal:120, protein:4.4, carbs:21.3, fat:1.9, fiber:2.8, sugar:0.9, sodium:7,   calcium:17,  iron:1.5, vitC:0   },

  // ── Proteins ─────────────────────────────────────────────
  { name:'Chicken Breast',      cat:'Protein',   unit:'g',  kcal:165, protein:31,  carbs:0,    fat:3.6, fiber:0,   sugar:0,   sodium:74,  calcium:15,  iron:1,   vitC:0   },
  { name:'Chicken Thigh',       cat:'Protein',   unit:'g',  kcal:209, protein:26,  carbs:0,    fat:11,  fiber:0,   sugar:0,   sodium:88,  calcium:12,  iron:1.3, vitC:0   },
  { name:'Egg (whole)',         cat:'Protein',   unit:'pc', kcal:78,  protein:6,   carbs:0.6,  fat:5.3, fiber:0,   sugar:0.6, sodium:62,  calcium:28,  iron:0.9, vitC:0   },
  { name:'Egg White',           cat:'Protein',   unit:'pc', kcal:17,  protein:3.6, carbs:0.2,  fat:0.1, fiber:0,   sugar:0.2, sodium:55,  calcium:4,   iron:0.1, vitC:0   },
  { name:'Tuna (canned)',       cat:'Protein',   unit:'g',  kcal:116, protein:25.5,carbs:0,    fat:1,   fiber:0,   sugar:0,   sodium:337, calcium:11,  iron:1.3, vitC:0   },
  { name:'Salmon',              cat:'Protein',   unit:'g',  kcal:208, protein:20,  carbs:0,    fat:13,  fiber:0,   sugar:0,   sodium:59,  calcium:12,  iron:0.8, vitC:0   },
  { name:'Paneer',              cat:'Protein',   unit:'g',  kcal:265, protein:18,  carbs:3.4,  fat:20,  fiber:0,   sugar:3,   sodium:400, calcium:480, iron:0.5, vitC:0   },
  { name:'Tofu (firm)',         cat:'Protein',   unit:'g',  kcal:76,  protein:8,   carbs:1.9,  fat:4.8, fiber:0.3, sugar:0.7, sodium:7,   calcium:350, iron:2.7, vitC:0.1 },
  { name:'Lentils (cooked)',    cat:'Legumes',   unit:'g',  kcal:116, protein:9,   carbs:20,   fat:0.4, fiber:7.9, sugar:1.8, sodium:2,   calcium:19,  iron:3.3, vitC:1.5 },
  { name:'Chickpeas (cooked)',  cat:'Legumes',   unit:'g',  kcal:164, protein:8.9, carbs:27,   fat:2.6, fiber:7.6, sugar:4.8, sodium:7,   calcium:49,  iron:2.9, vitC:1.3 },
  { name:'Black Beans (cooked)',cat:'Legumes',   unit:'g',  kcal:132, protein:8.9, carbs:24,   fat:0.5, fiber:8.7, sugar:0.3, sodium:1,   calcium:27,  iron:2.1, vitC:0   },
  { name:'Greek Yogurt',        cat:'Dairy',     unit:'g',  kcal:59,  protein:10,  carbs:3.6,  fat:0.4, fiber:0,   sugar:3.6, sodium:36,  calcium:111, iron:0.1, vitC:0   },
  { name:'Whole Milk',          cat:'Dairy',     unit:'ml', kcal:61,  protein:3.2, carbs:4.8,  fat:3.3, fiber:0,   sugar:5.1, sodium:43,  calcium:113, iron:0,   vitC:0   },
  { name:'Whey Protein (scoop)',cat:'Supplement',unit:'scoop', kcal:120,protein:25,carbs:3,  fat:1.5, fiber:0,   sugar:2,   sodium:130, calcium:130, iron:0.4, vitC:0   },

  // ── Vegetables ───────────────────────────────────────────
  { name:'Broccoli',            cat:'Vegetable', unit:'g',  kcal:34,  protein:2.8, carbs:7,    fat:0.4, fiber:2.6, sugar:1.7, sodium:33,  calcium:47,  iron:0.7, vitC:89  },
  { name:'Spinach',             cat:'Vegetable', unit:'g',  kcal:23,  protein:2.9, carbs:3.6,  fat:0.4, fiber:2.2, sugar:0.4, sodium:79,  calcium:99,  iron:2.7, vitC:28  },
  { name:'Sweet Potato',        cat:'Vegetable', unit:'g',  kcal:86,  protein:1.6, carbs:20,   fat:0.1, fiber:3,   sugar:4.2, sodium:55,  calcium:30,  iron:0.6, vitC:2.4 },
  { name:'Potato (boiled)',     cat:'Vegetable', unit:'g',  kcal:87,  protein:1.9, carbs:20,   fat:0.1, fiber:1.8, sugar:0.9, sodium:6,   calcium:5,   iron:0.3, vitC:13  },
  { name:'Carrot',              cat:'Vegetable', unit:'g',  kcal:41,  protein:0.9, carbs:10,   fat:0.2, fiber:2.8, sugar:4.7, sodium:69,  calcium:33,  iron:0.3, vitC:5.9 },
  { name:'Cucumber',            cat:'Vegetable', unit:'g',  kcal:15,  protein:0.7, carbs:3.6,  fat:0.1, fiber:0.5, sugar:1.7, sodium:2,   calcium:16,  iron:0.3, vitC:2.8 },
  { name:'Tomato',              cat:'Vegetable', unit:'g',  kcal:18,  protein:0.9, carbs:3.9,  fat:0.2, fiber:1.2, sugar:2.6, sodium:5,   calcium:10,  iron:0.3, vitC:14  },
  { name:'Onion',               cat:'Vegetable', unit:'g',  kcal:40,  protein:1.1, carbs:9.3,  fat:0.1, fiber:1.7, sugar:4.2, sodium:4,   calcium:23,  iron:0.2, vitC:7.4 },

  // ── Fruits ───────────────────────────────────────────────
  { name:'Banana',              cat:'Fruit',     unit:'pc', kcal:89,  protein:1.1, carbs:23,   fat:0.3, fiber:2.6, sugar:12,  sodium:1,   calcium:5,   iron:0.3, vitC:8.7 },
  { name:'Apple',               cat:'Fruit',     unit:'pc', kcal:95,  protein:0.5, carbs:25,   fat:0.3, fiber:4.4, sugar:19,  sodium:2,   calcium:11,  iron:0.2, vitC:8.4 },
  { name:'Orange',              cat:'Fruit',     unit:'pc', kcal:62,  protein:1.2, carbs:15,   fat:0.2, fiber:3.1, sugar:12,  sodium:0,   calcium:52,  iron:0.1, vitC:70  },
  { name:'Mango',               cat:'Fruit',     unit:'g',  kcal:60,  protein:0.8, carbs:15,   fat:0.4, fiber:1.6, sugar:14,  sodium:1,   calcium:11,  iron:0.2, vitC:36  },
  { name:'Strawberry',          cat:'Fruit',     unit:'g',  kcal:32,  protein:0.7, carbs:7.7,  fat:0.3, fiber:2,   sugar:4.9, sodium:1,   calcium:16,  iron:0.4, vitC:59  },
  { name:'Watermelon',          cat:'Fruit',     unit:'g',  kcal:30,  protein:0.6, carbs:7.6,  fat:0.2, fiber:0.4, sugar:6.2, sodium:1,   calcium:7,   iron:0.2, vitC:8.1 },
  { name:'Grapes',              cat:'Fruit',     unit:'g',  kcal:69,  protein:0.7, carbs:18,   fat:0.2, fiber:0.9, sugar:15,  sodium:2,   calcium:10,  iron:0.4, vitC:3.2 },

  // ── Dairy & Fats ─────────────────────────────────────────
  { name:'Cheddar Cheese',      cat:'Dairy',     unit:'g',  kcal:403, protein:25,  carbs:1.3,  fat:33,  fiber:0,   sugar:0.5, sodium:621, calcium:720, iron:0.7, vitC:0   },
  { name:'Butter',              cat:'Fats',      unit:'g',  kcal:717, protein:0.9, carbs:0.1,  fat:81,  fiber:0,   sugar:0.1, sodium:643, calcium:24,  iron:0,   vitC:0   },
  { name:'Olive Oil',           cat:'Fats',      unit:'ml', kcal:884, protein:0,   carbs:0,    fat:100, fiber:0,   sugar:0,   sodium:2,   calcium:1,   iron:0.6, vitC:0   },
  { name:'Avocado',             cat:'Fats',      unit:'g',  kcal:160, protein:2,   carbs:8.5,  fat:15,  fiber:6.7, sugar:0.7, sodium:7,   calcium:12,  iron:0.6, vitC:10  },
  { name:'Almonds',             cat:'Nuts',      unit:'g',  kcal:579, protein:21,  carbs:22,   fat:50,  fiber:12.5,sugar:4.4, sodium:1,   calcium:264, iron:3.7, vitC:0   },
  { name:'Peanut Butter',       cat:'Nuts',      unit:'g',  kcal:588, protein:25,  carbs:20,   fat:50,  fiber:6,   sugar:9,   sodium:426, calcium:49,  iron:1.9, vitC:0   },
  { name:'Cashews',             cat:'Nuts',      unit:'g',  kcal:553, protein:18,  carbs:30,   fat:44,  fiber:3.3, sugar:5.9, sodium:12,  calcium:37,  iron:6.7, vitC:0.5 },

  // ── Beverages ────────────────────────────────────────────
  { name:'Whole Milk (glass)',  cat:'Beverage',  unit:'ml', kcal:61,  protein:3.2, carbs:4.8,  fat:3.3, fiber:0,   sugar:5,   sodium:43,  calcium:113, iron:0,   vitC:0   },
  { name:'Orange Juice',        cat:'Beverage',  unit:'ml', kcal:45,  protein:0.7, carbs:10.4, fat:0.2, fiber:0.2, sugar:8.4, sodium:1,   calcium:11,  iron:0.2, vitC:50  },
  { name:'Coffee (black)',      cat:'Beverage',  unit:'ml', kcal:2,   protein:0.3, carbs:0,    fat:0,   fiber:0,   sugar:0,   sodium:2,   calcium:2,   iron:0,   vitC:0   },
  { name:'Green Tea',           cat:'Beverage',  unit:'ml', kcal:1,   protein:0.2, carbs:0,    fat:0,   fiber:0,   sugar:0,   sodium:2,   calcium:1,   iron:0,   vitC:0   },
  { name:'Protein Shake (milk)',cat:'Beverage',  unit:'ml', kcal:150, protein:20,  carbs:10,   fat:3,   fiber:0,   sugar:8,   sodium:200, calcium:250, iron:1,   vitC:0   },

  // ── Indian Foods ─────────────────────────────────────────
  { name:'Dal (cooked)',        cat:'Indian',    unit:'g',  kcal:116, protein:8,   carbs:19,   fat:0.6, fiber:7,   sugar:1,   sodium:5,   calcium:48,  iron:3.3, vitC:1   },
  { name:'Idli (1 piece)',      cat:'Indian',    unit:'pc', kcal:39,  protein:2,   carbs:8,    fat:0.3, fiber:0.5, sugar:0.2, sodium:80,  calcium:15,  iron:0.4, vitC:0   },
  { name:'Dosa',                cat:'Indian',    unit:'pc', kcal:168, protein:3.9, carbs:30,   fat:3.7, fiber:1.5, sugar:0.5, sodium:210, calcium:20,  iron:0.9, vitC:0   },
  { name:'Sambar (bowl)',       cat:'Indian',    unit:'g',  kcal:52,  protein:3,   carbs:8,    fat:1.2, fiber:2.5, sugar:2,   sodium:320, calcium:30,  iron:1,   vitC:5   },
  { name:'Curd / Yogurt',       cat:'Indian',    unit:'g',  kcal:61,  protein:3.5, carbs:4.7,  fat:3.3, fiber:0,   sugar:4.7, sodium:46,  calcium:121, iron:0.1, vitC:0.5 },
  { name:'Rajma (cooked)',      cat:'Indian',    unit:'g',  kcal:127, protein:8.7, carbs:22.8, fat:0.5, fiber:7.4, sugar:0.3, sodium:2,   calcium:28,  iron:2.2, vitC:1.2 },
  { name:'Poha',                cat:'Indian',    unit:'g',  kcal:333, protein:7.5, carbs:71.5, fat:1.2, fiber:1.6, sugar:0.2, sodium:17,  calcium:14,  iron:1.5, vitC:0   },
  { name:'Upma',                cat:'Indian',    unit:'g',  kcal:100, protein:2.6, carbs:18,   fat:2.1, fiber:1.8, sugar:0.5, sodium:200, calcium:15,  iron:0.8, vitC:0   },
];

/* ═══════════════════════════════════════════════════════════
   NUTRITION LOGGER ENGINE
═══════════════════════════════════════════════════════════ */

/** In-memory food log: { meal: [{food, qty, ...computed}] } */
let foodLog = { breakfast: [], lunch: [], dinner: [], snacks: [] };
let activeMeal = 'breakfast';
let selectedFood = null;

function initNutritionLogger() {
  // Set today's date in header
  const d = new Date();
  const opts = { weekday:'long', year:'numeric', month:'long', day:'numeric' };
  const nlDate = document.getElementById('nlDate');
  if (nlDate) nlDate.textContent = d.toLocaleDateString('en-IN', opts);

  // Meal tabs
  document.querySelectorAll('.meal-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.meal-tab').forEach(b => b.classList.remove('active-tab'));
      btn.classList.add('active-tab');
      activeMeal = btn.dataset.meal;
      document.getElementById('loggedMealLabel').textContent = capitalize(activeMeal);
      renderLoggedItems();
    });
  });

  // Search input
  const searchEl = document.getElementById('foodSearch');
  const clearBtn = document.getElementById('clearSearch');
  if (!searchEl) return;

  searchEl.addEventListener('input', () => {
    const q = searchEl.value.trim();
    clearBtn.classList.toggle('visible', q.length > 0);
    if (q.length < 1) {
      closeSuggestions();
      return;
    }
    showSuggestions(q);
  });

  clearBtn.addEventListener('click', () => {
    searchEl.value = '';
    clearBtn.classList.remove('visible');
    closeSuggestions();
    document.getElementById('foodEntryRow').style.display = 'none';
    selectedFood = null;
  });

  // Quantity controls
  document.getElementById('qtyPlus').addEventListener('click', () => {
    const el = document.getElementById('qtyInput');
    el.value = Math.min(+el.value + (selectedFood?.unit === 'g' ? 25 : 1), 2000);
    updateEntryPreview();
  });
  document.getElementById('qtyMinus').addEventListener('click', () => {
    const el = document.getElementById('qtyInput');
    el.value = Math.max(+el.value - (selectedFood?.unit === 'g' ? 25 : 1), 1);
    updateEntryPreview();
  });
  document.getElementById('qtyInput').addEventListener('input', updateEntryPreview);

  // Add food button
  document.getElementById('addFoodBtn').addEventListener('click', addFoodToLog);

  // Clear log
  document.getElementById('clearLogBtn').addEventListener('click', () => {
    if (confirm('Clear all logged foods for today?')) {
      foodLog = { breakfast: [], lunch: [], dinner: [], snacks: [] };
      renderLoggedItems();
      updateNutritionDashboard();
    }
  });
}

/* ── Suggestions ─────────────────────────────────────────── */
function showSuggestions(query) {
  const q = query.toLowerCase();
  const matches = FOOD_DB.filter(f =>
    f.name.toLowerCase().includes(q) || f.cat.toLowerCase().includes(q)
  ).slice(0, 8);

  const container = document.getElementById('foodSuggestions');
  if (!matches.length) {
    container.innerHTML = '<div class="suggestion-item"><div><div class="sug-name">No results found</div><div class="sug-category">Try: rice, egg, chicken, banana…</div></div></div>';
    container.classList.add('open');
    return;
  }

  container.innerHTML = matches.map((f, i) => `
    <div class="suggestion-item" data-idx="${FOOD_DB.indexOf(f)}">
      <div>
        <div class="sug-name">${f.name}</div>
        <div class="sug-category">${f.cat} · per ${f.unit === 'g' ? '100g' : f.unit === 'ml' ? '100ml' : '1 ' + f.unit}</div>
      </div>
      <span class="sug-cal">${f.kcal} kcal</span>
    </div>
  `).join('');

  container.classList.add('open');

  container.querySelectorAll('.suggestion-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = +item.dataset.idx;
      if (isNaN(idx)) return;
      selectFood(FOOD_DB[idx]);
      closeSuggestions();
      document.getElementById('foodSearch').value = FOOD_DB[idx].name;
    });
  });
}

function closeSuggestions() {
  document.getElementById('foodSuggestions').classList.remove('open');
}

/* ── Select Food ─────────────────────────────────────────── */
function selectFood(food) {
  selectedFood = food;
  document.getElementById('entryFoodName').textContent = food.name;

  const qtyEl  = document.getElementById('qtyInput');
  const unitEl = document.getElementById('qtyUnit');

  // Default qty: 100 for g/ml, 1 for pieces/scoops
  qtyEl.value = (food.unit === 'g' || food.unit === 'ml') ? 100 : 1;
  unitEl.textContent = food.unit;

  document.getElementById('foodEntryRow').style.display = 'block';
  updateEntryPreview();
}

function updateEntryPreview() {
  if (!selectedFood) return;
  const qty    = +document.getElementById('qtyInput').value || 1;
  const factor = computeFactor(selectedFood, qty);
  const n      = applyFactor(selectedFood, factor);

  document.getElementById('entryPreview').innerHTML = `
    <span class="ep-chip kcal">${Math.round(n.kcal)} kcal</span>
    <span class="ep-chip prot">${Math.round(n.protein)}g P</span>
    <span class="ep-chip carb">${Math.round(n.carbs)}g C</span>
    <span class="ep-chip fat">${Math.round(n.fat)}g F</span>
  `;
}

/* ── Add Food ────────────────────────────────────────────── */
function addFoodToLog() {
  if (!selectedFood) return;
  const qty    = +document.getElementById('qtyInput').value || 1;
  const factor = computeFactor(selectedFood, qty);
  const n      = applyFactor(selectedFood, factor);

  foodLog[activeMeal].push({
    id:      Date.now(),
    name:    selectedFood.name,
    unit:    selectedFood.unit,
    qty,
    kcal:    Math.round(n.kcal),
    protein: Math.round(n.protein * 10) / 10,
    carbs:   Math.round(n.carbs * 10) / 10,
    fat:     Math.round(n.fat * 10) / 10,
    fiber:   Math.round(n.fiber * 10) / 10,
    sugar:   Math.round(n.sugar * 10) / 10,
    sodium:  Math.round(n.sodium),
    calcium: Math.round(n.calcium),
    iron:    Math.round(n.iron * 10) / 10,
    vitC:    Math.round(n.vitC),
  });

  renderLoggedItems();
  updateNutritionDashboard();

  // Reset entry row
  document.getElementById('foodEntryRow').style.display = 'none';
  document.getElementById('foodSearch').value = '';
  document.getElementById('clearSearch').classList.remove('visible');
  selectedFood = null;
}

/* ── Render Logged Items ─────────────────────────────────── */
function renderLoggedItems() {
  const items    = foodLog[activeMeal];
  const container = document.getElementById('loggedItems');
  const empty    = document.getElementById('logEmpty');

  if (!items.length) {
    empty.style.display = 'flex';
    // Remove all item nodes except empty
    container.querySelectorAll('.log-item').forEach(el => el.remove());
    return;
  }
  empty.style.display = 'none';
  container.querySelectorAll('.log-item').forEach(el => el.remove());

  items.forEach(item => {
    const div = document.createElement('div');
    div.className = 'log-item';
    div.dataset.id = item.id;
    div.innerHTML = `
      <div>
        <div class="log-item-name">${item.name}</div>
        <div class="log-item-qty">${item.qty}${item.unit === 'pc' || item.unit === 'scoop' ? ' ' + item.unit : item.unit}</div>
      </div>
      <span class="log-item-kcal">${item.kcal} kcal</span>
      <button class="log-item-remove" data-id="${item.id}" title="Remove"><i class="ph ph-x"></i></button>
    `;
    div.querySelector('.log-item-remove').addEventListener('click', () => {
      foodLog[activeMeal] = foodLog[activeMeal].filter(f => f.id !== item.id);
      renderLoggedItems();
      updateNutritionDashboard();
    });
    container.appendChild(div);
  });
}

/* ── Nutrition Dashboard Update ──────────────────────────── */
function updateNutritionDashboard() {
  // Aggregate ALL meals
  const all = Object.values(foodLog).flat();

  const totals = all.reduce((acc, f) => {
    acc.kcal    += f.kcal;
    acc.protein += f.protein;
    acc.carbs   += f.carbs;
    acc.fat     += f.fat;
    acc.fiber   += f.fiber;
    acc.sugar   += f.sugar;
    acc.sodium  += f.sodium;
    acc.calcium += f.calcium;
    acc.iron    += f.iron;
    acc.vitC    += f.vitC;
    return acc;
  }, { kcal:0, protein:0, carbs:0, fat:0, fiber:0, sugar:0, sodium:0, calcium:0, iron:0, vitC:0 });

  // Round totals
  Object.keys(totals).forEach(k => {
    totals[k] = Math.round(totals[k] * 10) / 10;
  });

  // ── Calorie Ring ──────────────────────────────────────────
  const goalKcal = window._nutritionGoalKcal || 2000;
  const pct      = Math.min(totals.kcal / goalKcal, 1);

  const ringFill = document.getElementById('calRingFill');
  if (ringFill) ringFill.style.setProperty('--pct', pct);
  setEl('calRingVal',    totals.kcal);
  setEl('calRingTarget', `/ ${goalKcal} goal`);
  setEl('crsProtein',    `${totals.protein}g`);
  setEl('crsCarbs',      `${totals.carbs}g`);
  setEl('crsFat',        `${totals.fat}g`);

  // ── Macro Bars ────────────────────────────────────────────
  updateMacroBars(totals);

  // ── Micronutrients ────────────────────────────────────────
  setEl('micNa',  Math.round(totals.sodium));
  setEl('micCa',  Math.round(totals.calcium));
  setEl('micFe',  totals.iron.toFixed(1));
  setEl('micVitC',Math.round(totals.vitC));

  // ── AI Insight ────────────────────────────────────────────
  generateNutritionInsight(totals, goalKcal);
}

function updateMacroBars(totals = null) {
  const t  = window._nutritionTargets;
  const el = document.getElementById('mbGoalNote');

  if (!t) {
    if (el) el.style.display = 'flex';
    return;
  }
  if (el) el.style.display = 'none';

  // Set goal labels
  setEl('mbProteinGoal', t.proteinG);
  setEl('mbCarbsGoal',   t.carbsG);
  setEl('mbFatGoal',     t.fatG);
  setEl('mbFiberGoal',   t.fiberG);
  setEl('mbSugarGoal',   t.sugarG);

  if (!totals) return;

  setEl('mbProteinEaten', totals.protein);
  setEl('mbCarbsEaten',   totals.carbs);
  setEl('mbFatEaten',     totals.fat);
  setEl('mbFiberEaten',   totals.fiber);
  setEl('mbSugarEaten',   totals.sugar);

  setBarWidth('mbProteinBar', totals.protein, t.proteinG);
  setBarWidth('mbCarbsBar',   totals.carbs,   t.carbsG);
  setBarWidth('mbFatBar',     totals.fat,      t.fatG);
  setBarWidth('mbFiberBar',   totals.fiber,    t.fiberG);
  setBarWidth('mbSugarBar',   totals.sugar,    t.sugarG);
}

function generateNutritionInsight(totals, goalKcal) {
  const insight = document.getElementById('nutritionInsight');
  const text    = document.getElementById('niText');
  if (!insight || !text) return;

  const t = window._nutritionTargets;
  if (!t || totals.kcal === 0) {
    insight.style.display = 'none';
    return;
  }

  insight.style.display = 'block';
  const pct = (totals.kcal / goalKcal) * 100;

  let msg = '';
  if      (pct < 30)  msg = `You've consumed ${Math.round(pct)}% of your daily calorie goal. Don't skip meals — consistent eating supports metabolism and muscle retention.`;
  else if (pct < 70)  msg = `Great progress! ${Math.round(pct)}% of your calorie goal reached. Focus on hitting your protein target of ${t.proteinG}g — you're at ${totals.protein}g so far.`;
  else if (pct < 95)  msg = `Almost there at ${Math.round(pct)}% of calories. You need ${Math.round(goalKcal - totals.kcal)} kcal more. Prioritize protein-rich foods to finish the day strong.`;
  else if (pct <= 110) msg = `Excellent! You've hit your calorie target today. Protein: ${totals.protein}/${t.proteinG}g · Carbs: ${totals.carbs}/${t.carbsG}g · Fat: ${totals.fat}/${t.fatG}g. Great macro balance!`;
  else                msg = `You've exceeded your calorie goal by ${Math.round(totals.kcal - goalKcal)} kcal. That's okay occasionally — adjust tomorrow's plan or add a short cardio session.`;

  text.textContent = msg;
}

/* ── Nutrition Helpers ───────────────────────────────────── */

/**
 * Returns the multiplier to scale 100g/100ml/1pc nutrient data
 * to the entered quantity.
 */
function computeFactor(food, qty) {
  if (food.unit === 'g' || food.unit === 'ml') return qty / 100;
  return qty; // per piece / scoop — values are already per unit
}

function applyFactor(food, factor) {
  return {
    kcal:    food.kcal    * factor,
    protein: food.protein * factor,
    carbs:   food.carbs   * factor,
    fat:     food.fat     * factor,
    fiber:   food.fiber   * factor,
    sugar:   food.sugar   * factor,
    sodium:  food.sodium  * factor,
    calcium: food.calcium * factor,
    iron:    food.iron    * factor,
    vitC:    food.vitC    * factor,
  };
}

/* ── DOM Helpers ─────────────────────────────────────────── */
function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function setBarWidth(id, val, max) {
  const el = document.getElementById(id);
  if (el) el.style.setProperty('--w', `${Math.min((val / max) * 100, 100).toFixed(1)}%`);
}

