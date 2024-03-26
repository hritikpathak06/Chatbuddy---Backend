import Chat from "../models/chatModel.js";
import User from "../models/userModel.js";
import { faker, simpleFaker } from "@faker-js/faker";

const createUser = async (numUsers) => {
  try {
    const usersPromise = [];
    for (let i = 0; i < numUsers; i++) {
      const tempUser = User.create({
        name: faker.person.fullName(),
        username: faker.internet.userName(),
        bio: faker.lorem.sentence(10),
        password: "12345",
        avatar: {
          public_id: faker.system.fileName(),
          url: faker.image.avatar(),
        },
      });
      usersPromise.push(tempUser);
    }
    await Promise.all(usersPromise);
    console.log("Users Created", numUsers);
    process.exit(1);
  } catch (error) {
    console.log(error);
  }
};


const createSingleChat = async (numChats) => {
  const users = await User.find().select("_id");

  const chatPromise = [];

  for (let i = 0; i < users.length; i++) {
    for (let j = i; j < users.length; j++) {
      chatPromise.push(
        Chat.create({
          name: faker.lorem.words(2),
          members: [users[i], users[j]],
        })
      );
    }
  }
  await Promise.all(chatPromise);
  console.log("chats Created Successfully");
  process.exit(1);
};

const craeteGroupChats = async (numChats) => {
  try {
    const users = await User.find().select("_id");
    const chatPromise = [];

    for (let i = 0; i < numChats; i++) {
      const numMembers = simpleFaker.number.int({ min: 3, max: users.length });

      const chatMembers = [];

      for (let i = 0; i < numMembers; i++) {
        const randomIndex = Math.floor(Math.random() * users.length);
        const randomUser = users[randomIndex];

        if (!members.includes(randomUser)) {
          members.push(randomUser);
        }
      }

      const chat = Chat.create({
        groupChat: true,
        name: faker.lorem.words(1),
        members,
        creator: members[0],
      });
    }

    await Promise.all(chatPromise);
    console.log("Chats Created Successfully");
  } catch (error) {}
};

export { createUser, createSingleChat, craeteGroupChats };
