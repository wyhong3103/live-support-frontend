import {v4} from 'uuid';
import { Box, Input, Center, Button, VStack, InputGroup, Text, HStack, Heading, Spacer, Flex } from "@chakra-ui/react";
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

let socket;


const Support = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [agent, setAgent] = useState({
        accessToken: '',
        id: ''
    });
    const agentRef = useRef(agent);
    const [text ,setText] = useState('');
    const [sessions, setSessions] = useState([]);
    const [messages, setMessages] = useState([]);
    const messagesRef = useRef([]);
    const [roomId, setRoomId] = useState('');
    const roomIdRef = useRef(roomId); 
    const [loginStatus, setLoginStatus] = useState(0);
    const [loginErrorMessage, setLoginErrorMessage] = useState('');
    const api_url = process.env.NEXT_PUBLIC_API_URL;
    const scrollChatBubbleRef = useRef(null);

    const login = async () => {
        const res = await fetch(`${api_url}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password,
                type: 'SPT'
            })
        });

        const data = await res.json();

        if (!res.ok){
            setLoginStatus(1);
            setLoginErrorMessage(data.message);
            return;
        }

        setAgent({
            accessToken: data.access_token,
            id: data.id
        });
        setLoginStatus(2);
    }

    const getSessionId = (roomId) => {
        for(const i of sessions){
            if (i.roomId === roomId) {
                return i.id;
            }
        }
    }

    const isSessionAlive = (roomId) => {
        for(const i of sessions){
            if (i.roomId === roomId) {
                const now = Math.floor(Date.now()/1000);
                if (!i.endedEarly && now - i.lastUpdated < 5 * 60){
                    return true;
                }else return false;
            }
        }
    }

    const getSessionStatus = (roomId) => {
        for(const i of sessions){
            if (i.roomId === roomId) {
                if (i.endedEarly){
                    return 'ended'
                }else return 'timed out'
            }
        }
    }

    const markEnd = (roomId) => {
        const temp = [];
        for(let i = 0; i < sessions.length; i++){
            const temp2 = {...sessions[i]};
            if (temp2.roomId === roomId) {
                temp2.endedEarly = true;
            }
            temp.push(temp2);
        }
        setSessions([...temp]);
    }

    const joinAllSessions = (sessions) => {
        const now = Math.floor(Date.now()/1000);
        for(const i of sessions){
            if (!i.endedEarly && now - i.lastUpdated < 5 * 60){
                socket.emit('join_room', i.roomId);
            }
        }
    }

    const getSessions = async (init = false) => {
        const res = await fetch(
            `${api_url}/agent/sessions`,
            {
                method: 'POST', 
                headers: {
                    'Authorization': `Bearer ${agentRef.current.accessToken}`,
                    'Content-Type': 'application/json',
                },
                }
        )

        if (!res.ok){
            setAgent({
                accessToken: '',
                id: ''
            });
            return;
        }

        const data = await res.json();
        data.sort((a,b) => a.lastUpdated - b.lastUpdated);
        data.reverse();

        setSessions([...data]);

        if (init){
            joinAllSessions(data);
        }
    }

    const getMessages = async (roomId) => {
        const res = await fetch(
            `${api_url}/session/${getSessionId(roomId)}`,
            {
                method: 'POST', 
                headers: {
                    'Authorization': `Bearer ${agentRef.current.accessToken}`,
                    'Content-Type': 'application/json',
                },
                }
        )

        if (!res.ok){
            setAgent({
                accessToken: '',
                id: ''
            });
            return;
        }

        const data = await res.json();

        setMessages([...data.sort((a, b) => a.timestamp - b.timestamp)]);
    }

    const submit = () => {
        socket.emit('message', {roomId, text, author:'AGT'});
        setText('');
    }

    const endChat = () => {
        socket.emit('end_chat', {roomId});
        markEnd(roomId);

    }

    const switchChat = () => {
        socket.emit('switch_chat', {roomId});
        markEnd(roomId);
    }

    const changeRoom = (id) => {
        setRoomId(id);
        getMessages(id);
        socket.emit('join_room', id)
    }

    useEffect(() => {
        socket = io(api_url);

        socket.on('receive_assigned', async (payload) => {
            if (payload.agentId === socket.id){
                socket.emit('join_room', payload.roomId);
                getSessions();
            }
        })

        socket.on('receive_message', async (payload) => {
            getSessions();
            if (roomIdRef.current === payload.roomId){
                const temp = messagesRef.current;
                temp.push({message: payload.message, author: payload.author, timestamp: Math.floor(Date.now()/1000)})
                setMessages([...temp])
            }
        })
    },[])

    useEffect(() => {
        agentRef.current = {...agent};
        if (agent.accessToken.length > 0){
            socket.emit('support_agent_on', {id:agent.id})
            getSessions(true);
        }
    },[agent]);

    useEffect(() => {
        roomIdRef.current = roomId;
    },[roomId])

    useEffect(() => {
        messagesRef.current = messages;
        if (scrollChatBubbleRef.current) {
            scrollChatBubbleRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    },[messages])

    return(
        loginStatus <= 1? 
        <Center h='100vh' w='100vw'>
            <VStack gap='20px' w='300px'>
                <Heading size='md'>
                    Support Agent Login
                </Heading>
                <VStack gap='10px' w='100%'>
                    <Input isInvalid={loginStatus === 1} placeholder='email' value={email} onChange={(e) => (setEmail(e.target.value))}/>
                    <Input isInvalid={loginStatus === 1} placeholder='password' type='password' value={password} onChange={(e) => (setPassword(e.target.value))}/>
                </VStack>
                {
                    loginStatus === 1 ? 

                    <Text color='red' maxW='100%'>
                        {loginErrorMessage}
                    </Text>
                    : 
                    null
                }
                <Button onClick={login} w='100%'>
                    Login
                </Button>
            </VStack>
        </Center>
        :
        <Center w='100vw' h='100vh'>
            <VStack h='600px' w='800px' bg='gray.200' p='30px' borderRadius={'10px'}>
                <Heading size='md' w='100%'>
                    Customers
                </Heading>
                <Flex h='95%' w='100%' py='20px' gap='10px'>
                    <VStack h='100%' overflow='auto' w='200px' py='20px' pr='10px'>
                        {
                            sessions.map(i => 
                                <Flex p='10px' bg='white' w='100%'
                                key={v4()}
                                 _hover={{bg:'#EEE', transition: 'all 0.2s', cursor: 'pointer'}}  
                                 onClick={() => changeRoom(i.roomId)}
                                 borderRadius={'10px'}
                                 >
                                    {i.name}
                                </Flex>
                            )
                        }
                    </VStack>
                    <Spacer/>
                    <VStack w='500px'>
                        {
                            roomId === '' ?

                            <Center h='100%'>
                                <Text>
                                    Start Supporting!
                                </Text>
                            </Center>
                            :

                            <Flex h='100%'w='100%' direction='column' bg='white' borderRadius={'10px'}>
                                <VStack w='100%' overflowY={'auto'} h='100%' p='10px'>
                                {
                                    messages.map(
                                        i => 
                                        <Flex direction='row' w='100%' key={v4()}>
                                            {
                                                i.author === 'AGT' ?
                                                <Spacer/>
                                                :
                                                null
                                            }
                                            <Text bg={i.author === 'AGT'? 'gray.100' : 'gray.300'} p='10px' borderRadius={'10px'} maxW='180px' overflowWrap={'break-word'}>
                                                {i.message}
                                            </Text>
                                            {
                                                i.author !== 'AGT' ?
                                                <Spacer/>
                                                :
                                                null
                                            }
                                        </Flex>
                                    )
                                }
                                <Box ref={scrollChatBubbleRef}>
                                </Box>

                                </VStack>
                                <Spacer/>
                                {
                                    isSessionAlive(roomId) ?

                                    <HStack p='10px'>
                                        <Input placeholder='Enter your text' value={text} onChange={(e) => (setText(e.target.value))}/>
                                        <Button onClick={submit}>
                                            Send
                                        </Button>
                                        <Button onClick={endChat}>
                                            End
                                        </Button>
                                        <Button onClick={switchChat}>
                                            Switch
                                        </Button>
                                    </HStack>
                                    :
                                    <Flex justify={'center'} align='center' p='10px'>
                                        <Text>
                                            This conversation has {getSessionStatus(roomId)}.
                                        </Text>
                                    </Flex>
                                }
                            </Flex>
                        }
                    </VStack>
                </Flex>
            </VStack>
        </Center>
    )
}

export default Support;