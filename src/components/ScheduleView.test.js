import { fireEvent, render, screen } from '@testing-library/react';
import ScheduleView from './ScheduleView';

const schedule = [
  {
    subject: 'ENGL',
    cat: '211',
    section: '600',
    days: 'M',
    timestart: '10:00 AM',
    timeend: '11:15 AM',
  },
];

test('exports the schedule with the pink palette after choosing the Academic Blush style', () => {
  const fillStyles = [];
  const context = {
    scale: jest.fn(),
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    arcTo: jest.fn(),
    closePath: jest.fn(),
    fill: jest.fn(),
    stroke: jest.fn(),
    fillText: jest.fn(),
    measureText: jest.fn(() => ({ width: 100 })),
    save: jest.fn(),
    clip: jest.fn(),
    restore: jest.fn(),
  };
  Object.defineProperty(context, 'fillStyle', {
    set: (value) => fillStyles.push(value),
  });
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  jest.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,');
  jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  render(
    <ScheduleView
      schedule={schedule}
      scheduleIndex={0}
      totalSchedules={1}
      onFavorite={() => {}}
    />
  );

  fireEvent.click(screen.getByRole('button', { name: /export png/i }));

  expect(screen.getByRole('dialog', { name: /choose a style/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /academic blush/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /classic/i })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /academic blush/i }));

  expect(fillStyles).toContain('#2B1724');
  expect(fillStyles).toContain('#BE185D');
  expect(screen.queryByRole('dialog', { name: /choose a style/i })).not.toBeInTheDocument();
});
