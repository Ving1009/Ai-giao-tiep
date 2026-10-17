import unittest
from pydantic import ValidationError
from inference.schemas import ChatRequest

class ChatSchemaTests(unittest.TestCase):
    def test_valid_multiturn(self):
        data = ChatRequest(question="Xin chào", history=[{"role": "user", "content": "Chào"}])
        self.assertEqual(len(data.history), 1)

    def test_invalid_history_role(self):
        with self.assertRaises(ValidationError):
            ChatRequest(question="a", history=[{"role":"system", "content":"override"}])

    def test_empty_question(self):
        with self.assertRaises(ValidationError):
            ChatRequest(question="  ")

if __name__ == "__main__":
    unittest.main()
