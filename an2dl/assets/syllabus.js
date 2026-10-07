window.SYLLABUS = {
  course: { id: 'an2dl', title: 'Тетрадь AN2DL', subtitle: 'Нейросети с нуля: главы 1–3 конспекта, с рисунками и живыми демонстрациями', sourceLabel: 'Конспект, стр.', sourceGenitive: 'конспекта', examLang: 'en', footer: 'самостоятельный разбор глав 1–3 неофициального конспекта курса Artificial Neural Networks and Deep Learning (Politecnico di Milano). Ошибки конспекта помечены красной ручкой и исправлены.',
    decks: {
      s01: { lecture: 1, label: 'Лекция 1', title: 'Machine Learning vs Deep Learning', file: '01 - DeepLearningIntro.pdf', slides: 36 },
      s02: { lecture: 2, label: 'Лекция 2', title: 'From Perceptrons to Feed Forward Neural Networks', file: '02 - Perceptron2NeuralNetworks.pdf', slides: 55, printed: { from: 52, offset: 1 } },
      s03: { lecture: 3, label: 'Лекция 3', title: 'Neural Networks Training and Overfitting', file: '03 - NeuralNetworksTraining.pdf', slides: 41, printed: { from: 37, offset: 1 } },
      s00: { lecture: 0, label: 'Вводная лекция', title: 'Introduction to the course', file: '00 - AN2DL Intro.pdf', slides: 27, printed: { from: 14, offset: 1 } }
    } },
  modules: [
    { id: 'm1', title: 'Что такое deep learning', source: 'Конспект, гл. 1 · стр. 8–34 · слайды лекции 1', lessons: [
      { id: 'l01', file: 'l01.html', title: 'Что значит «машина учится»', teaser: 'Определение Митчелла (T, E, P) на автошколе и спам-фильтре, supervised learning и чем classification отличается от regression.', minutes: 40, pages: '8–14', slides: 'лекция 1, слайды 2–7' },
      { id: 'l02', file: 'l02.html', title: 'Учиться без ответов', teaser: 'Unsupervised learning на трёх пиццериях (K-means), дендрограммы и reinforcement learning: награда вместо правильного ответа.', minutes: 40, pages: '15–22', slides: 'лекция 1, слайды 9–16' },
      { id: 'l03', file: 'l03.html', title: 'Всё дело в признаках', teaser: 'Почему умный классификатор не спасает плохие признаки, как были устроены системы до 2012 года и что именно изменил deep learning.', minutes: 40, pages: '23–28', slides: 'лекция 1, слайды 18–26, 36' },
      { id: 'l04', file: 'l04.html', title: 'Почему именно 2012 год', teaser: 'Данные, видеокарты и AlexNet: что запустило deep learning, где он не нужен и почему ChatGPT — тоже он.', minutes: 45, pages: '28–34', slides: 'лекция 1, слайды 17, 27–36' }
    ] },
    { id: 'm2', title: 'От перцептрона к нейросети', source: 'Конспект, гл. 2 · стр. 35–122 · слайды лекции 2', lessons: [
      { id: 'l05', file: 'l05.html', title: 'Машина, которая сама крутит ручки', teaser: 'Зачем копировать мозг, кто придумал искусственный нейрон и как он устроен: взвешенная сумма, порог и трюк с bias.', minutes: 35, pages: '35–42', slides: 'лекция 2, слайды 2–9' },
      { id: 'l06', file: 'l06.html', title: 'Один нейрон — одна прямая', teaser: 'Перцептрон как логический вентиль AND и OR и как линейный классификатор: веса задают прямую, bias её сдвигает.', minutes: 35, pages: '43–46, 51–53', slides: 'лекция 2, слайды 10, 13–14' },
      { id: 'l07', file: 'l07.html', title: 'Учиться только на ошибках', teaser: 'Hebbian learning: как перцептрон сам находит веса. Пошаговый разбор на таблице OR и условие, при котором правило сходится.', minutes: 30, pages: '47–50', slides: 'лекция 2, слайды 11–12' },
      { id: 'l08', file: 'l08.html', title: 'Четыре точки, остановившие науку', teaser: 'Линейная разделимость и XOR: почему один нейрон бессилен, что показали Минский и Пейперт и как помогает скрытый слой.', minutes: 40, pages: '54–56', slides: 'лекция 2, слайды 14–16' },
      { id: 'l09', file: 'l09.html', title: 'От нейрона к сети', teaser: 'Архитектура feed-forward сети, обозначения весов, подсчёт параметров и почему без нелинейности сто слоёв равны одному.', minutes: 40, pages: '57–63', slides: 'лекция 2, слайды 17–18' },
      { id: 'l10', file: 'l10.html', title: 'Диммеры вместо выключателей', teaser: 'Sigmoid и tanh: формулы, производные, диапазоны, насыщение и первое знакомство с затухающим градиентом.', minutes: 35, pages: '64–70', slides: 'лекция 2, слайды 18–19' },
      { id: 'l11', file: 'l11.html', title: 'Один двигатель, разные приборные панели', teaser: 'Выходной слой и функция ошибки для regression, бинарной и многоклассовой classification: linear, sigmoid, softmax, cross-entropy.', minutes: 40, pages: '71–83', slides: 'лекция 2, слайды 19, 42–52' },
      { id: 'l12', file: 'l12.html', title: 'LEGO для функций', teaser: 'Universal approximation theorem: что она утверждает, как собрать любую кривую из сигмоид и чего теорема не обещает.', minutes: 40, pages: '84–85, 123–125', slides: 'лекция 2, слайд 20' },
      { id: 'l13', file: 'l13.html', title: 'Спуск в тумане', teaser: 'Обучение как минимизация ошибки: sum of squared errors, поверхность ошибки, gradient descent, learning rate и локальные минимумы.', minutes: 45, pages: '86–99', slides: 'лекция 2, слайды 21–24, 27–28' },
      { id: 'l14', file: 'l14.html', title: 'Жалоба идёт назад по конвейеру', teaser: 'Backpropagation шаг за шагом: chain rule, forward pass и backward pass, вывод формулы обновления веса вручную.', minutes: 35, pages: '100–106', slides: 'лекция 2, слайды 25–33' },
      { id: 'l15', file: 'l15.html', title: 'Откуда берутся функции ошибки', teaser: 'Maximum likelihood: почему для regression получается сумма квадратов, а для classification — cross-entropy.', minutes: 35, pages: '107–113', slides: 'лекция 2, слайды 34–52' },
      { id: 'l16', file: 'l16.html', title: 'Забор со стрелкой', teaser: 'Perceptron learning algorithm как gradient descent: расстояние до гиперплоскости, функция D(w, w₀) и итог всей главы.', minutes: 35, pages: '114–122', slides: 'лекция 2, слайды 53–55' }
    ] },
    { id: 'm3', title: 'Обобщение и overfitting', source: 'Конспект, гл. 3 · стр. 123–199 · слайды лекции 3', lessons: [
      { id: 'l17', file: 'l17.html', title: 'Бритва Оккама', teaser: 'Underfitting, overfitting и bias–variance trade-off: почему сеть, способная выучить всё, выучит и шум.', minutes: 40, pages: '124, 126–131', slides: 'лекция 3, слайды 2–3' },
      { id: 'l18', file: 'l18.html', title: 'Честный экзамен для модели', teaser: 'Training, validation и test set, hold-out и утечки данных: как измерить generalization и не обмануть себя.', minutes: 45, pages: '132–138', slides: 'лекция 3, слайды 4–6, 10' },
      { id: 'l19', file: 'l19.html', title: 'Экзамен по кругу', teaser: 'LOOCV, K-fold и nested cross-validation: как оценивать модель, когда данных мало, и почему лучший результат всегда завышен.', minutes: 45, pages: '136, 139–149', slides: 'лекция 3, слайды 6–10' },
      { id: 'l20', file: 'l20.html', title: 'Когда нажать «стоп»', teaser: 'Early stopping: кривые training и validation, patience и почему останавливаться на первом подъёме рано.', minutes: 40, pages: '150–154', slides: 'лекция 3, слайды 11–12' },
      { id: 'l21', file: 'l21.html', title: 'Ручки, которые сеть не крутит сама', teaser: 'Hyperparameters и их подбор: grid search, random search и Bayesian optimisation.', minutes: 40, pages: '155–163', slides: 'лекция 3, слайды 13, 16' },
      { id: 'l22', file: 'l22.html', title: 'Пружины на весах', teaser: 'Weight decay (L2-регуляризация): что он делает с весами и почему это то же самое, что априорное распределение в MAP.', minutes: 40, pages: '164–172', slides: 'лекция 3, слайды 14–16' },
      { id: 'l23', file: 'l23.html', title: 'Тренировка с отсутствующими', teaser: 'Dropout: случайно выключаем нейроны, получаем ансамбль сетей и правильно масштабируем веса на тесте.', minutes: 35, pages: '173–175', slides: 'лекция 3, слайды 17–22' },
      { id: 'l24', file: 'l24.html', title: 'Испорченный телефон', teaser: 'Почему градиент затухает и взрывается в глубоких сетях и чем помогают ReLU, Leaky ReLU и ELU.', minutes: 50, pages: '176–183', slides: 'лекция 3, слайды 23–29' },
      { id: 'l25', file: 'l25.html', title: 'Ксерокопия ксерокопии', teaser: 'С каких весов начинать обучение: почему нули не работают и откуда берутся формулы Xavier и He.', minutes: 45, pages: '184–187', slides: 'лекция 3, слайды 30–32' },
      { id: 'l26', file: 'l26.html', title: 'Оценка по кривой', teaser: 'Batch normalization: четыре шага, параметры γ и β, разница между обучением и inference.', minutes: 40, pages: '188–192', slides: 'лекция 3, слайды 33–37' },
      { id: 'l27', file: 'l27.html', title: 'Ложка супа и тяжёлый шар', teaser: 'Mini-batch gradient descent, расписания learning rate, momentum и адаптивные оптимизаторы.', minutes: 55, pages: '193–199', slides: 'лекция 3, слайды 38–41' }
    ] }
  ],
  extras: [
    { id: 'formulas', file: 'formulas.html', title: 'Шпаргалка формул', teaser: 'Формулы всех 27 уроков на одной странице, урок за уроком, со ссылкой на место, где каждая выводится.' },
    { id: 'exam', file: 'exam.html', title: 'Экзаменационный тренажёр', teaser: '176 вопросов в формате экзамена AN2DL с модельными ответами на английском: фильтры по типу и модулю, случайная десятка.' },
    { id: 'glossary', file: 'glossary.html', title: 'Словарь EN → RU', teaser: '258 терминов, которые прозвучат на лекции и на экзамене: что они значат и в каком уроке разобраны. С поиском.' },
    { id: 'errata', file: 'errata.html', title: 'Красная ручка: ошибки конспекта', teaser: '90 неточностей неофициального конспекта по порядку страниц: что написано, как правильно и почему.' }
  ]
};
