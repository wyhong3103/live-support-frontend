import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    useDisclosure,
    Radio, RadioGroup,
} from '@chakra-ui/react'
import { Box, Input, Center, Button, VStack, InputGroup, Text, HStack, Flex, Spacer, Heading } from "@chakra-ui/react";
import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

let socket;

const Mid = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [botUrl, setBotUrl] = useState('');
    const [botAuthToken, setBotAuthToken] = useState('');
    const [queue, setQueue] = useState([]);
    const selectedId = useRef('');
    const [loginStatus, setLoginStatus] = useState(0);
    const [radioValue, setRadioValue] = useState('1')
    const { isOpen, onOpen, onClose } = useDisclosure()
    const api_url = process.env.NEXT_PUBLIC_API_URL;

    const login = async () => {
        const res = await fetch(`${api_url}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                password,
            })
        });

        if (!res.ok){
            setLoginStatus(1);
            return;
        }

        const data = await res.json();

        socket.emit('mid_agent_on', {id: data.id});
        setLoginStatus(2);
    }

    const clearInput = () => {
        setBotAuthToken('');
        setBotUrl('');
        selectedId.current = '';
        setRadioValue('1');
    }

    const assignToBot = (id) => {
        socket.emit('assign', {clientId: id, to: 'BOT', botAuthToken, botUrl});
    }

    const assignToAgent = (id) => {
        socket.emit('assign', {clientId: id, to: 'AGT', botAuthToken:'', botUrl:''});
    }

    const assign = () => {
        if (radioValue === '1'){
            assignToAgent(selectedId.current);
        }else{
            assignToBot(selectedId.current);
        }
        onClose();
        clearInput();
    }

    useEffect(() => {
        socket = io(api_url);

        socket.on('receive_queue', (payload) => {
            const q = payload.queue;
            setQueue([...q]);
        })
    },[])

    return(
        <>
        <Modal isOpen={isOpen} onClose={onClose}>
            <ModalOverlay />
            <ModalContent>
            <ModalHeader>Assign Customer</ModalHeader>
            <ModalCloseButton />
            <ModalBody>
                <RadioGroup onChange={setRadioValue} value={radioValue}>
                    <Flex gap='20px' direction='column'>
                        <Radio value='1'>To Live Agent</Radio>
                        <VStack gap='10px' w='250px'>
                            <Radio value='2' w='100%'>To GPT Bot</Radio>
                            <Input placeholder='GPT URL' isDisabled={radioValue!=='2'} value={botUrl} onChange={(e) => (setBotUrl(e.target.value))}/>
                            <Input placeholder='TOKEN' isDisabled={radioValue!=='2'}value={botAuthToken} onChange={(e) => (setBotAuthToken(e.target.value))}/>
                        </VStack>
                    </Flex>
                </RadioGroup>
            </ModalBody>

            <ModalFooter>
                <Button colorScheme='blue' mr={3} onClick={assign}>
                    Assign
                </Button>
                <Button variant='ghost' onClick={() => {
                    onClose();
                    clearInput();
                }}>
                    Close
                </Button>
            </ModalFooter>
            </ModalContent>
        </Modal>
        {
            loginStatus <= 1? 
            <Center h='100vh' w='100vw'>
                <VStack gap='20px'>
                    <Heading size='md'>
                        Middleman Login
                    </Heading>
                    <VStack gap='10px'>
                        <Input isInvalid={loginStatus === 1} placeholder='email' value={email} onChange={(e) => (setEmail(e.target.value))}/>
                        <Input isInvalid={loginStatus === 1} placeholder='password' type='password' value={password} onChange={(e) => (setPassword(e.target.value))}/>
                    </VStack>
                    <Button onClick={login} w='100%'>
                        Login
                    </Button>
                </VStack>
            </Center>
            :
            <Center w='100vw' h='100vh'>
                <VStack w='400px' h='600px' bg='gray.200' borderRadius={'10px'} p='20px' gap='20px'>
                    <Heading w='100%' size='md'>
                        Customers Queue
                    </Heading>

                    {
                        queue.length > 0 ?

                        <VStack h='90%' w='100%' overflow='auto' gap='15px'>
                            {
                                queue.map(
                                    i =>
                                    <Flex w='100%' justify={'center'} align='center' p='10px' bg='white' borderRadius='10px'>
                                        <Text>
                                            {i.name}
                                        </Text>
                                        <Spacer/>
                                        <Button onClick={() => {
                                            selectedId.current = i.id;
                                            onOpen();
                                        }}>
                                            Assign
                                        </Button>
                                    </Flex>
                                )
                            }
                        </VStack>

                        :

                        <Center h='100%' w='100%'>
                            <Text>
                                There is no one in the queue now.
                            </Text>
                        </Center>

                    }
                </VStack>
            </Center>
        }        
        </>
    )
}

export default Mid;