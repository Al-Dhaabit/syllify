import { generateSchedules } from './scheduler';

describe('Scheduler Regression Tests', () => {
    test('standard lecture should produce a single bundle', () => {
        const sheetData = [
            { subject: 'CS', cat: '101', section: '601', class: '1001', days: 'TR', timestart: '10:00 AM', timeend: '11:15 AM' }
        ];
        const result = generateSchedules(['CS101'], sheetData);
        expect(result.schedules.length).toBe(1);
        expect(result.schedules[0].length).toBe(1);
    });

    test('standard lecture and lab (pattern match) should bundle together', () => {
        const sheetData = [
            { subject: 'PHYS', cat: '211', section: '600', class: '2001', days: 'MW', timestart: '1:00 PM', timeend: '2:15 PM' },
            { subject: 'PHYS', cat: '211', section: '60L1', class: '2002', days: 'F', timestart: '2:00 PM', timeend: '4:00 PM' }
        ];
        const result = generateSchedules(['PHYS211'], sheetData);
        expect(result.schedules.length).toBe(1);
        expect(result.schedules[0].length).toBe(2); // Both lecture and lab
    });

    test('multiple lecture sections should produce separate options', () => {
        const sheetData = [
            { subject: 'ENGL', cat: '101', section: '601', class: '3001', days: 'MW', timestart: '9:00 AM', timeend: '10:15 AM' },
            { subject: 'ENGL', cat: '101', section: '602', class: '3002', days: 'TR', timestart: '9:00 AM', timeend: '10:15 AM' }
        ];
        const result = generateSchedules(['ENGL101'], sheetData);
        expect(result.schedules.length).toBe(2); // Two different options
    });

    test('fallback to row-level if Class # is missing', () => {
        const sheetData = [
            { subject: 'HIST', cat: '111', section: '601', days: 'MW', timestart: '9:00 AM', timeend: '10:15 AM' },
            // If class # is missing, they should just be treated as individual rows
            { subject: 'HIST', cat: '111', section: '601', days: 'F', timestart: '9:00 AM', timeend: '10:15 AM' }
        ];
        const result = generateSchedules(['HIST111'], sheetData);
        // Without class #, it doesn't know to bundle them, so they are separate options
        expect(result.schedules.length).toBe(2);
    });
});
