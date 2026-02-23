import _ from 'lodash'

interface TemplateParams {
  RiskRating: string
  RiskQuestionsString: string
  RiskAnswersString: string
  date: string
}

const riskLabels: Record<string, { label: string; description: string }> = {
  '1': { label: 'Lower', description: 'Conservative, short-term changes for modest/stable returns' },
  '2': { label: 'Lower-Medium', description: 'Cautious, reasonable long-term returns, accept some risk' },
  '3': { label: 'Medium', description: 'Balanced, accepts fluctuations for better long-term returns' },
  '4': { label: 'Medium-Higher', description: 'Comfortable with risk for higher long-term returns' },
  '5': { label: 'Higher', description: 'Very comfortable, aiming for high long-term returns' },
}

const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --navy: #18263a;
      --dark-navy: #22384f;
      --teal: #9de6e4;
      --cream: #fff5e6;
      --coral: #f0645a;
      --grey: #8c9097;
      --light-grey: #eeeeee;
      --divider: #dddddd;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Roboto', sans-serif;
      color: var(--navy);
      font-size: 12px;
      line-height: 1.5;
    }

    .page {
      page-break-after: always;
      padding: 0;
      min-height: 100%;
    }
    .page:last-child { page-break-after: auto; }

    /* Page 1 */
    .accent-top { height: 4px; background: var(--teal); }
    .accent-bottom { height: 4px; background: var(--teal); margin-top: 40px; }

    h1 {
      font-family: Georgia, serif;
      font-size: 24px;
      font-weight: normal;
      color: var(--navy);
      margin: 24px 0 16px;
    }

    .results-box {
      background: var(--light-grey);
      border-radius: 8px;
      padding: 24px;
      display: flex;
      gap: 24px;
      margin-bottom: 20px;
    }

    .rating-circle {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: var(--teal);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      font-weight: 700;
      color: var(--navy);
      flex-shrink: 0;
    }

    .rating-info h2 {
      font-family: Georgia, serif;
      font-size: 18px;
      font-weight: normal;
      color: var(--navy);
      margin-bottom: 8px;
    }

    .rating-info p {
      color: var(--grey);
      font-size: 13px;
    }

    .info-box {
      background: rgba(157, 230, 228, 0.15);
      border-left: 4px solid var(--teal);
      border-radius: 4px;
      padding: 12px 16px;
      font-size: 12px;
      color: var(--navy);
      margin-top: 20px;
    }

    .date-line {
      color: var(--grey);
      font-size: 11px;
      margin-top: 16px;
    }

    /* Pages 2 & 3 */
    .report-header {
      font-family: Georgia, serif;
      font-size: 18px;
      color: var(--navy);
      padding-bottom: 8px;
      border-bottom: 2px solid var(--teal);
      margin-bottom: 16px;
    }

    h3 {
      font-size: 14px;
      font-weight: 700;
      color: var(--navy);
      margin-bottom: 8px;
    }

    h5 {
      font-size: 12px;
      font-weight: 700;
      color: var(--grey);
      margin-bottom: 12px;
    }

    .question-list {
      padding-left: 20px;
    }

    .question-list li {
      margin-bottom: 14px;
    }

    .question-text {
      font-weight: 700;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .answer-option {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 2px 0;
      font-size: 11px;
    }

    .radio-circle {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid var(--grey);
      flex-shrink: 0;
    }

    .radio-circle.selected {
      border-color: var(--teal);
      background: var(--teal);
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .page { page-break-after: always; }
    }
  </style>
</head>
<body>
  <!-- Page 1: Results Summary -->
  <div class="page">
    <div class="accent-top"></div>
    <h1>Risk Profile Results</h1>
    <div class="results-box">
      <div class="rating-circle"><%= RiskRating %></div>
      <div class="rating-info">
        <h2>Your attitude to risk is <%= riskLabel %></h2>
        <p><%= riskDescription %></p>
      </div>
    </div>
    <div class="info-box">
      Please email this document to your Financial Adviser so they can discuss your risk profile and recommend an appropriate investment strategy.
    </div>
    <p class="date-line">Generated on <%= date %></p>
    <div class="accent-bottom"></div>
  </div>

  <!-- Page 2: Questions 1-7 -->
  <div class="page">
    <div class="report-header">Risk Profiler Report</div>
    <h3>Your questions and answers:</h3>
    <h5>Risk Questionnaire:</h5>
    <ol class="question-list first-section" start="1"></ol>
  </div>

  <!-- Page 3: Questions 8-13 -->
  <div class="page">
    <div class="report-header">Risk Profiler Report</div>
    <h3>Your questions and answers (continued):</h3>
    <ol class="question-list second-section" start="8"></ol>
  </div>

  <script>
    (function() {
      var questionsData = JSON.parse('<%= RiskQuestionsString %>');
      var answersData = JSON.parse('<%= RiskAnswersString %>');

      var answersMap = {};
      answersData.forEach(function(a) {
        answersMap[a.questionId] = a.responseId;
      });

      function buildQuestionHtml(q) {
        var selectedId = answersMap[q.id];
        var html = '<li><div class="question-text">' + q.text + '</div>';
        q.answers.forEach(function(a) {
          var isSelected = a.id === selectedId;
          html += '<div class="answer-option">';
          html += '<div class="radio-circle' + (isSelected ? ' selected' : '') + '"></div>';
          html += '<span>' + a.text + '</span>';
          html += '</div>';
        });
        html += '</li>';
        return html;
      }

      var firstHtml = '';
      var secondHtml = '';
      questionsData.forEach(function(q) {
        if (q.id <= 7) {
          firstHtml += buildQuestionHtml(q);
        } else {
          secondHtml += buildQuestionHtml(q);
        }
      });

      document.querySelector('.first-section').innerHTML = firstHtml;
      document.querySelector('.second-section').innerHTML = secondHtml;
    })();
  </script>
</body>
</html>`

export function compileTemplate(params: TemplateParams): string {
  const riskInfo = riskLabels[params.RiskRating] ?? { label: 'Unknown', description: '' }

  const compiled = _.template(htmlTemplate)
  return compiled({
    ...params,
    riskLabel: riskInfo.label,
    riskDescription: riskInfo.description,
  })
}
