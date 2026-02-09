import { generateSchedules, hasValidTimeData } from './scheduler';

describe('Scheduler Split-Timing Reproduction', () => {
    test('should bundle split-timing rows (same Class #) together', () => {
        // Mock data representing the user's scenario
        // Row 1: MW 1:05 PM - 2:25 PM
        // Row 2: F 11:10 AM - 12:05 PM
        // Both have Class # 57388
        const sheetData = [
            {
                subject: 'MATH',
                cat: '182',
                section: '602',
                class: '57388', // This is the unique Class # identifier
                days: 'MW',
                timestart: '1:05 PM',
                timeend: '2:25 PM',
                instructor: 'Nastaran Naghshineh',
                title: 'Calculus II'
            },
            {
                subject: 'MATH',
                cat: '182',
                section: '602',
                class: '57388', // Same Class #
                days: 'F',
                timestart: '11:10 AM',
                timeend: '12:05 PM',
                instructor: 'Nastaran Naghshineh',
                title: 'Calculus II'
            }
        ];

        const selectedCourses = ['MATH182'];

        // This helper confirms the data is valid for processing
        expect(hasValidTimeData(sheetData[0])).toBe(true);
        expect(hasValidTimeData(sheetData[1])).toBe(true);

        const result = generateSchedules(selectedCourses, sheetData);

        expect(result.error).toBeNull();
        expect(result.schedules.length).toBeGreaterThan(0);

        // We expect the generated schedule to contain *both* rows because they are parts of the same section
        const schedule = result.schedules[0];

        // FAIL CONDITION (Current Behavior): 
        // Logic sees them as separate options and picks one. Schedule has 1 item.
        // EXPECTED CONDITION (Desired Behavior):
        // Logic sees them as one bundle. Schedule has 2 items (both rows).

        expect(schedule.length).toBe(2);

        // Verify we have both the MW and F times
        const days = schedule.map(s => s.days).sort();
        expect(days).toEqual(['F', 'MW']);
    });
});
