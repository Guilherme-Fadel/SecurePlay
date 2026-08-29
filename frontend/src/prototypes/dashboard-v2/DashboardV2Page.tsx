import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDashboardStats, useDailyChallenge, useWeeklyStreak, useDashboardRanking } from '@/hooks/useDashboard';
import { ArrowRight, Check, Flame, KeyRound, LockKeyhole, ShieldCheck, Sparkles, Trophy, Zap } from 'lucide-react';
import './styles.css';
export default function DashboardV2Page() {
    const { user } = useCurrentUser();
    const { stats, loading: statsLoading } = useDashboardStats();
    const { challenge } = useDailyChallenge();
    const { streak } = useWeeklyStreak();
    const { ranking } = useDashboardRanking();
    if (statsLoading) {
        return <div className="dbv2-loading">Carregando...</div>;
    }
    const totalPoints = stats?.totalPoints ?? 0;
    const level = stats?.level ?? 1;
    const xpToNext = stats?.xpToNextLevel ?? 1000;
    const xpMax = totalPoints + xpToNext;
    const xpPercent = Math.round((totalPoints / xpMax) * 100);
    const rank = stats?.globalRanking ?? 0;
    const streakCount = streak?.streak ?? 0;
    const completedChallenges = stats?.completedChallenges ?? 0;
    const totalChallenges = stats?.totalActiveChallenges ?? 1;
    const completionPercent = Math.round((completedChallenges / totalChallenges) * 100);
    const top3 = ranking?.top?.slice(0, 3) ?? [];
    const difficulty = challenge?.difficulty ?? 'iniciante';
    const diffLabel: Record<string, string> = { iniciante: 'Easy', intermediario: 'Medium', avancado: 'Hard' };
    return (<div className="dbv2-root">

      <aside className="dbv2-sidebar">
        <div className="dbv2-logo">
          <div className="dbv2-logo-icon" aria-hidden="true">
            <ShieldCheck size={22} strokeWidth={2.2}/>
          </div>
          <div className="dbv2-logo-text">
            <span className="dbv2-logo-title">SecurePlay</span>
            <span className="dbv2-logo-sub">Academy</span>
          </div>
        </div>
        <nav className="dbv2-nav">
          <a className="dbv2-nav-item active">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
            Dashboard
          </a>
          <a className="dbv2-nav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            Modules
          </a>
          <a className="dbv2-nav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
            Leaderboard
          </a>
          <a className="dbv2-nav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16 12-4-4-4 4"/><path d="M12 16V8"/></svg>
            Missions
          </a>
          <a className="dbv2-nav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>
            Inventory
          </a>
          <a className="dbv2-nav-item">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Profile
          </a>
        </nav>
      </aside>


      <div className="dbv2-main">

        <header className="dbv2-header">
          <h1 className="dbv2-page-title">Dashboard</h1>
          <div className="dbv2-header-right">
            <div className="dbv2-header-avatar">{user?.name?.charAt(0) ?? '?'}</div>
            <span className="dbv2-header-name">{user?.name ?? 'Agent'}</span>
          </div>
        </header>


        <main className="dbv2-content">

          <div className="dbv2-welcome">
            <div className="dbv2-welcome-left">
              <div className="dbv2-avatar-large">
                <span>{user?.name?.charAt(0) ?? '?'}</span>
                <i className="dbv2-avatar-status" aria-hidden="true"/>
              </div>
              <div className="dbv2-welcome-info">
                <h2>Welcome back, {user?.name?.split(' ')[0] ?? 'Agent'}!</h2>
                <p className="dbv2-welcome-msg">Ready to secure the network?</p>
                <div className="dbv2-welcome-metrics">
                  <div className="dbv2-metric">
                    <span className="dbv2-metric-label">Rank</span>
                    <span className="dbv2-metric-value dbv2-game-value">#{rank}</span>
                  </div>
                  <div className="dbv2-metric">
                    <span className="dbv2-metric-label">Level</span>
                    <span className="dbv2-metric-value dbv2-game-value">{level}</span>
                  </div>
                  <div className="dbv2-metric dbv2-metric-xp">
                    <span className="dbv2-metric-label">XP</span>
                    <div className="dbv2-xp-row">
                      <span className="dbv2-metric-value">{totalPoints.toLocaleString('pt-BR')}</span>
                      <span className="dbv2-xp-sep">/</span>
                      <span className="dbv2-xp-max">{xpMax.toLocaleString('pt-BR')}</span>
                    </div>
                    <div className="dbv2-xp-bar">
                      <div className="dbv2-xp-fill" style={{ width: `${xpPercent}%` }}/>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="dbv2-welcome-right">
              <div className="dbv2-level-pill">
                <Zap size={15} aria-hidden="true"/>
                <span className="dbv2-level-label">Level</span>
                <span className="dbv2-level-num">{level}</span>
              </div>
              <div className="dbv2-streak-pill">
                <Flame className="dbv2-streak-icon" size={17} aria-hidden="true"/>
                <span>Streak: <strong>{streakCount}</strong> Days</span>
              </div>
            </div>
          </div>


          <div className="dbv2-grid">

            <div className="dbv2-col">
              <div className="dbv2-card">
                <div className="dbv2-card-top">
                  <span className="dbv2-card-label">Current Module</span>
                  <div className="dbv2-badge-check" aria-hidden="true"><Check size={14} strokeWidth={3}/></div>
                </div>
                <h3 className="dbv2-card-title">Intro to Cryptography</h3>
                <p className="dbv2-card-sub">{completionPercent}% Complete</p>
                <div className="dbv2-progress">
                  <div className="dbv2-progress-fill" style={{ width: `${completionPercent}%` }}/>
                </div>
                <span className="dbv2-progress-tag">{completionPercent}% Complete</span>
              </div>

              <div className="dbv2-card">
                <div className="dbv2-card-top">
                  <span className="dbv2-card-label">Skill Tree</span>
                  <div className="dbv2-badge-purple">{completedChallenges}</div>
                </div>
                <h3 className="dbv2-card-title">Network Security</h3>
                <p className="dbv2-card-sub">Unlocked {completedChallenges} nodes</p>
                <div className="dbv2-skill-tree">
                  {Array.from({ length: 6 }).map((_, i) => {
            const state = i < completedChallenges ? 'completed' : i === completedChallenges ? 'current' : 'locked';
            return (<div key={i} className={`dbv2-skill-step ${state}`}>
                        <div className="dbv2-skill-node" aria-label={`Node ${i + 1}: ${state}`}>
                          {state === 'completed' ? <Check size={13} strokeWidth={3}/> : state === 'locked' ? <LockKeyhole size={12}/> : <span>{i + 1}</span>}
                        </div>
                      </div>);
        })}
                </div>
              </div>
            </div>


            <div className="dbv2-col">
              <div className="dbv2-challenge">
                <div className="dbv2-challenge-header">
                  <span className="dbv2-challenge-htitle">DAILY CHALLENGE</span>
                  <div className="dbv2-challenge-accent-dot" aria-hidden="true"><Sparkles size={15}/></div>
                </div>
                <div className="dbv2-challenge-body">
                  <p className="dbv2-challenge-label">Challenge:</p>
                  <h3 className="dbv2-challenge-name">{challenge?.title ?? 'Decrypt the Malicious Cipher'}</h3>
                  <div className="dbv2-challenge-meta">
                    <span>Difficulty: <strong>{diffLabel[difficulty]}</strong></span>
                    <span>Timer: <strong>{challenge?.duration ?? 15}:00 left</strong></span>
                  </div>
                  <div className="dbv2-challenge-reward">
                    XP Reward: <strong>{challenge?.points ?? 500}</strong>
                  </div>
                  <div className="dbv2-code-block">
                    <code>
                      <span className="tok-kw">cat</span> /etc {'{'}{'\n'}
                      {'  '}<span className="tok-fn">decrypt</span> the_Malware() {'{'}{'\n'}
                      {'    '}difficulty: <span className="tok-str">{diffLabel[difficulty]}</span>, XP_Reward: <span className="tok-num">{challenge?.points ?? 500}</span>,{'\n'}
                      {'    '}return <span className="tok-str">flag</span>{'\n'}
                      {'  '}{'}'}{'\n'}
                      {'}'}
                    </code>
                  </div>
                  <button className="dbv2-challenge-btn">
                    Submit Solution
                    <ArrowRight size={17} aria-hidden="true"/>
                  </button>
                </div>
              </div>
            </div>


            <div className="dbv2-col">
              <div className="dbv2-card">
                <div className="dbv2-card-heading">
                  <span className="dbv2-card-label">Leaderboard</span>
                  <Trophy size={17} aria-hidden="true"/>
                </div>
                <p className="dbv2-card-sub" style={{ marginTop: 4, marginBottom: 16 }}>Top 3 students</p>
                <div className="dbv2-leaderboard">
                  {top3.map((entry, i) => (<div key={entry.position} className="dbv2-lb-item">
                      <div className={`dbv2-lb-avatar medal-${i}`}>
                        {entry.name.charAt(0)}
                        <span className="dbv2-lb-xp">XP</span>
                      </div>
                      <span className="dbv2-lb-name">{entry.name.split(' ')[0]}</span>
                      <span className={`dbv2-lb-medal medal-${i}`}>
                        {i === 0 ? 'Gold' : i === 1 ? 'Silver' : 'Bronze'}
                      </span>
                    </div>))}
                </div>
              </div>

              <div className="dbv2-card">
                <div className="dbv2-card-heading">
                  <span className="dbv2-card-label">Recent Achievements</span>
                  <Sparkles size={17} aria-hidden="true"/>
                </div>
                <div className="dbv2-achievements">
                  <div className="dbv2-ach-item">
                    <div className="dbv2-ach-icon yellow"><ShieldCheck size={23} strokeWidth={2.2} aria-hidden="true"/></div>
                    <div>
                      <strong>Phishing Hunter</strong>
                      <p>Unlocked recently</p>
                    </div>
                  </div>
                  <div className="dbv2-ach-item">
                    <div className="dbv2-ach-icon cyan"><KeyRound size={23} strokeWidth={2.2} aria-hidden="true"/></div>
                    <div>
                      <strong>Codebreaker</strong>
                      <p>Especialista em cifras</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>);
}
