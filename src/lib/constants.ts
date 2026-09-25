
import { Event } from "./db";

export const EVENT_CATEGORIES = [
    { id: 'tech-frontier', label: 'Tech Frontier Challenges', description: 'Robo Race, Drone Tech, Debates', image: '/assets/tech-frontier.jpg' },
    { id: 'brainwave', label: 'Brain Wave Challenges', description: 'Code Quest, Ideathon, Symposium', image: '/assets/brainwave.jpg' },
    { id: 'skill-forge', label: 'Skill Forge Workshops', description: 'Blockchain, Electronics', image: '/assets/skill-forge.jpg' },
    { id: 'multimedia', label: 'Multi Media & E-Sports', description: 'Photography, Reels, Gaming', image: '/assets/multimedia.jpg' },
    { id: 'cultural', label: 'Cultural Events', description: 'Dance, Music, Fashion Show', image: '/assets/culturals.jpg' },
    { id: 'sports', label: 'Sports', description: 'Volleyball, Basketball, Throwball', image: '/assets/sports.jpg' },
];

export const EVENTS_DATA: Event[] = [
    // 1. HACKATHON (The Big One)
    {
        id: 'hackathon',
        title: 'AADHRITA HACK24',
        description: 'National Level 24-Hour Software Hackathon. Build real-world solutions.',
        category: 'Flagship',
        imagePosterUrl: 'https://images.unsplash.com/photo-1504384308090-c54be3855833?q=80&w=2662&auto=format&fit=crop',
        registrationStatus: 'open',
        isRegistrationOpen: true,
        registrationMode: 'online',
        minTeamSize: 3,
        maxTeamSize: 4,
        entryFeeInr: 600,
        entryFeeAft: 0,
        rewardAft: 50, // Reward for registering
        formConfig: {
            askTeamName: true,
            askPptUrl: true,
            customFields: [
                {
                    id: 'problem_stmt',
                    label: 'Problem Statement ID (if known)',
                    type: 'text',
                    required: false,
                    placeholder: 'e.g. PS-01'
                },
                {
                    id: 'github_link',
                    label: 'GitHub Repository Link (Optional)',
                    type: 'text',
                    required: false
                }
            ]
        },
        createdAt: null
    },

    // 2. CODING CONTEST
    {
        id: 'code-fury',
        title: 'Code Fury',
        description: 'Competitive coding challenge to test your algorithms and speed.',
        category: 'Tech Frontier',
        imagePosterUrl: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?q=80&w=2669&auto=format&fit=crop',
        registrationStatus: 'coming_soon',
        isRegistrationOpen: false,
        registrationMode: 'online',
        minTeamSize: 1,
        maxTeamSize: 2,
        entryFeeInr: 200,
        entryFeeAft: 0,
        rewardAft: 20,
        formConfig: {
            askTeamName: true,
            askPptUrl: false,
            customFields: [
                {
                    id: 'language_pref',
                    label: 'Preferred Language',
                    type: 'select',
                    options: ['C++', 'Java', 'Python', 'JavaScript'],
                    required: true
                }
            ]
        },
        createdAt: null
    },

    // 3. DANCE COMPETITION
    {
        id: 'nritya-kshetra',
        title: 'Nritya Kshetra (Solo/Group)',
        description: 'Unleash your rhythm on the grand stage.',
        category: 'Cultural',
        imagePosterUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=2669&auto=format&fit=crop',
        registrationStatus: 'open',
        isRegistrationOpen: true,
        registrationMode: 'online',
        minTeamSize: 1,
        maxTeamSize: 10,
        entryFeeInr: 300,
        entryFeeAft: 0,
        rewardAft: 30,
        formConfig: {
            askTeamName: true,
            askPptUrl: false,
            askSoundReqs: true,
            customFields: [
                {
                    id: 'track_link',
                    label: 'Music Track Link (Drive/YouTube)',
                    type: 'text',
                    required: true
                },
                {
                    id: 'dance_style',
                    label: 'Dance Style',
                    type: 'text',
                    required: true,
                    placeholder: 'Classical, Hip Hop, Fusion...'
                }
            ]
        },
        createdAt: null
    }
];

export const AUTHORIZED_ADMIN_EMAILS = [
    'rattumethelesh@gmail.com',
    'gsnreddy125@gmail.com',
    'sarthakrunthala7@gmail.com',
    'mithileshkumarrattu@gmail.com',
];
