import {v4} from 'uuid';
import {
    Popover,
    PopoverTrigger,
    PopoverContent,
    PopoverHeader,
    PopoverBody,
    PopoverArrow,
    PopoverCloseButton,
    Center,
    Spacer,
} from '@chakra-ui/react'
import { Box, Input, Button, VStack, Text, HStack, Heading, Flex, Spinner } from "@chakra-ui/react";
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

let socket;

const Client = () => {
    const [prompt, setPrompt] = useState('Enter your name and email to get support.')
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const nameRef = useRef(name);
    const emailRef = useRef(email);
    const [roomId, setRoomId] = useState('');
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [messages, setMessages] = useState([]);
    const [countDown, setCountDown] = useState(0);
    const scrollChatBubbleRef = useRef(null);
    const api_url = process.env.NEXT_PUBLIC_API_URL;


    const reset = (new_prompt) => {
        setPrompt(new_prompt);
        setName('');
        setEmail('');
        setRoomId('');
        setText('');
        setMessages([])
    }

    const enqueue = () => {
        socket.emit('enqueue', {name, email});
        setPrompt('You are being directed to our best support, be patient!')
        setLoading(true);
    }

    const submit = () => {
        socket.emit('message', {roomId, text, author:'USR'});
        setText('');
    }
    
    useEffect(() => {
        socket = io(api_url);

        socket.on('receive_assigned', (payload) => {
            if (payload.clientId === socket.id){
                setLoading(false);
                setRoomId(payload.roomId)
                setMessages([]);
                socket.emit('join_room', payload.roomId);
            }
        })

        socket.on('receive_message', async (payload) => {
            setMessages(prev => [...prev, {message: payload.message, author: payload.author, timestamp: payload.timestamp}])
        })

        socket.on('switch_chat', async (payload) => {
            setPrompt('You are being redirected, just hold on a second!')
            setMessages([])
            setLoading(true)
            socket.emit('enqueue', {name: nameRef.current, email: emailRef.current});
        })

        socket.on('end_chat', async (payload) => {
            reset('The conversation has ended, please enter your name and email if you would like to seek for support.');
        })

        socket.on('timed_out', async (payload) => {
            reset('The conversation has timed out, please enter your name and email if you would like to seek for support.');
        })
    }, [])

    useEffect(() => {
        setCountDown(5 * 60)

        let intervalId = setInterval(() => {
        setCountDown((prevTime) => Math.max(0, prevTime - 1));
        }, 1000);

        if (scrollChatBubbleRef.current) {
            scrollChatBubbleRef.current.scrollIntoView({ behavior: 'smooth' });
        }

        return () => {
            clearInterval(intervalId);
        }
    },[messages])


    useEffect(() => {
        nameRef.current = name;
        emailRef.current = email;
    },[name, email])


    return(
        <Box h='100vh' w='100vw' position='relative'>
            <Popover>
            <PopoverTrigger>
                <Button position='absolute' bottom='20px' right='20px'>Live Support</Button>
            </PopoverTrigger>
            <PopoverContent>
                <PopoverArrow />
                <PopoverCloseButton />
                <PopoverHeader>
                    <Heading size='md'>
                        Support
                    </Heading>
                </PopoverHeader>
                <PopoverBody>
                    <Box w='100%' h='350px' p='10px'>
                        {
                            loading ? 
                            <Flex justify={'center'} align='center' direction='column' h='100%'>
                                <VStack gap='20px'>
                                    <Text>
                                        {prompt}
                                    </Text>
                                    <Spinner size='xl' />
                                </VStack>
                            </Flex>
                            :
                            (
                            roomId === '' ?
                            <Flex justify='center' align='center' direction='column' gap='20px'>
                                <Text>
                                    {
                                        prompt
                                    }
                                </Text>
                                <VStack w='100%'>
                                    <Input placeholder='name' value={name} onChange={(e) => (setName(e.target.value))}/>
                                    <Input placeholder='email' value={email} onChange={(e) => (setEmail(e.target.value))}/>
                                </VStack>
                                <Button onClick={enqueue}>
                                    Get Support
                                </Button>
                            </Flex>
                            :
                               
                            <Flex h='100%'w='100%' direction='column'>
                                <VStack w='100%' overflowY={'auto'} h='100%' p='10px'>
                                {
                                    messages.map(
                                        i => 
                                        <Flex direction='row' w='100%' key={v4()}>
                                            {
                                                i.author === 'USR' ?
                                                <Spacer/>
                                                :
                                                null
                                            }
                                            <Text bg={i.author === 'USR'? 'gray.100' : 'gray.300'} p='10px' borderRadius={'10px'} maxW='180px' overflowWrap={'break-word'}>
                                                {i.message}
                                            </Text>
                                            {
                                                i.author !== 'USR' ?
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
                                <VStack position='relative' py='5px'>
                                    <HStack>
                                        <Input placeholder='Enter your text' value={text} onChange={(e) => (setText(e.target.value))}/>
                                        <Button onClick={submit}>
                                            Send
                                        </Button>
                                    </HStack>
                                    <Box w='100%' position='absolute' bottom='-15px' left='2px'>
                                        <Text fontSize={'11px'}>
                                            Timeout: {Math.floor(countDown/60)}:{countDown%60 <= 9 ? '0' : null}{countDown%60}
                                        </Text>
                                    </Box>
                                </VStack>
                            </Flex>
                            )
                        }
                    </Box>
                </PopoverBody>
            </PopoverContent>
            </Popover>

        </Box>
    )
}

export default Client;
