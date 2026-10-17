import test from 'node:test';
import assert from 'node:assert/strict';
import PDFDocument from 'pdfkit';

const { buildExerciseReportPdfBuffer } = await import('../src/lib/exercise-report-pdf.js');

test('el PDF entrega completas las precauciones y el objetivo aprobados', async (t) => {
  const written = [];
  const originalText = PDFDocument.prototype.text;
  t.mock.method(PDFDocument.prototype, 'text', function (text, ...rest) {
    written.push(String(text));
    return originalText.call(this, text, ...rest);
  });
  const caution = `Detener si aparece dolor irradiado, hormigueo o pérdida de fuerza; consultar antes de progresar la carga. ${'Mantener la columna neutra durante todo el recorrido. '.repeat(3)}`.slice(0, 280).trim();
  const why = `Recuperar el control lumbopélvico y la tolerancia a la carga en sedestación. ${'Objetivo aprobado por el fisioterapeuta. '.repeat(12)}`.slice(0, 600).trim();
  const exercise = { nombre: 'Puente de glúteo', series: 3, repeticiones: 10, procedimiento: 'Paso '.repeat(360).trim(), why, cautions: [caution, caution, caution] };
  const buffer = await buildExerciseReportPdfBuffer({ patient_name: 'Paciente ficticio', exercises: [exercise, exercise] });
  assert.ok(buffer.length > 1000);
  const text = written.join('\n');
  assert.ok(text.includes(caution), 'precaución íntegra');
  assert.ok(text.includes(why), 'objetivo íntegro');
});
