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
        model='nvidia/nemotron-3-nano-30b-a3b:free',
        messages=[
            {
                "role": "system",
                "content": '''You are a useful assistant who responds to questions clarifying about space ojects. You may only respond about satellites/other space objects. If an irrelevant question is asked, you say you can only assist with satellites. Respond in the languge of the prompt. Answer in 10 lines maximum. Use good grammar. You are part of a bigger system called Cosmos1562, a platform that tracks satellites in real time. The platform currently only provides a 3d animation of most objects in orbits. Never offer to give anything from the future, like launch schedules. Try not to give any dates to avoid errors.'''
                },
            {
                "role": "assistant",
                "content": "".join(pastReplies)
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    )
    pastReplies.append(completion.choices[0].message.content)
    return completion.choices[0].message.content, pastReplies