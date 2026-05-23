import dotenv
import os
from openai import OpenAI

dotenv.load_dotenv()

def aiInteract(prompt, pastReplies):
    AIclient = OpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=os.getenv('OPENROUTER_KEY'),
    )
    completion = AIclient.chat.completions.create(
        model=os.getenv('model'),
        messages=[
            {
                "role": "system",
                "content": '''
                            You are a helpfull AI assistant built into my Cosmos1562 app, which provides real time 3d rendering of the locations of man-made orbital objects. The objects can be clicked to see object name, lat/long and altitude, as well as operator country. There is a path rendered on the Earth to show where it will fly over.
                            You must ONLY respond to questions relevant to the opic of space. If an irrelevant question is asked, you say you can only assist with space objects.
                            You must reply in the same language as the prompt.
                            Never mention any future events like launch schedules to avoid misinformation.
                            Answer in no more than 4 sentances.
                        '''
                },
            {
                "role": "assistant",
                "content": "".join(pastReplies)
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        max_tokens=int(os.getenv('max_tokens'))
    )
    pastReplies.append(completion.choices[0].message.content)
    return completion.choices[0].message.content, pastReplies