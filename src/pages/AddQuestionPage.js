// src/pages/AddQuestionPage.js
import React, { useState } from 'react';
import { getDatabase, ref, set } from 'firebase/database';
import { useAuth } from '../hooks/useAuth';

function AddQuestionPage() {
  const { user } = useAuth();
  const [courseId, setCourseId] = useState('');
  const [questionText, setQuestionText] = useState('');
  const [answers, setAnswers] = useState(['', '', '', '']);
  const [correctAnswer, setCorrectAnswer] = useState('');

  const handleAnswerChange = (index, value) => {
    const newAnswers = [...answers];
    newAnswers[index] = value;
    setAnswers(newAnswers);
  };

  const handleSubmit = async () => {
    if (user && courseId && questionText && answers.length === 4 && correctAnswer) {
      const db = getDatabase();
      const questionRef = ref(db, `courses/${courseId}/questions`);
      const newQuestionRef = ref(questionRef);
      await set(newQuestionRef, {
        question: questionText,
        answers: {
          answerId1: answers[0],
          answerId2: answers[1],
          answerId3: answers[2],
          answerId4: answers[3]
        },
        correctAnswer: `answerId${parseInt(correctAnswer, 10)}`
      });
      alert('Question added successfully');
    } else {
      alert('Please fill all fields and provide a valid course ID');
    }
  };

  return (
    <div>
      <h2>Add Question</h2>
      <input
        type="text"
        placeholder="Course ID"
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
      />
      <input
        type="text"
        placeholder="Question"
        value={questionText}
        onChange={(e) => setQuestionText(e.target.value)}
      />
      {answers.map((answer, index) => (
        <input
          key={index}
          type="text"
          placeholder={`Answer ${index + 1}`}
          value={answer}
          onChange={(e) => handleAnswerChange(index, e.target.value)}
        />
      ))}
      <input
        type="text"
        placeholder="Correct Answer Index (1-4)"
        value={correctAnswer}
        onChange={(e) => setCorrectAnswer(e.target.value)}
      />
      <button onClick={handleSubmit}>Submit Question</button>
    </div>
  );
}

export default AddQuestionPage;
