import pytchat

video_id = "7fKvTuHbIEM"

def main():
    chat = pytchat.create(video_id)
    try:
        while chat.is_alive():
            for c in chat.get().sync_items():
                print(f"{c.datetime} [{c.author.name}]- {c.message}")
                
                if(c.type == "superChat"):
                    print("Thanks for the Super chat")
    except Exception as e:
        # TODO: Parse error logs
        print(e)
        print(f"Exception occured with the payload: {c.message}")
        exit()

if __name__ == "__main__":
    print("********Started YouTube Server********")
    print("======================================")
    main()
