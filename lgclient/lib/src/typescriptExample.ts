var num: number;
var str: string;
var bool: boolean;

num = 1234;
num = 123.456;
//num = '123'; // Error

str = '123';
//tr = 123; // Error

bool = true;
bool = false;
//bool = 'false'; // Error
console.log(num)

//es6 allow function,default parameter
const greet=(name:string='Robet')=>console.log(`hello ${name}`)
greet('scott')
greet();

//spread operators
const numbers:number[]=[-3,10,15]
console.log(Math.min(...numbers))
const newArr:number[]=[1,2,3,...numbers]
console.log(newArr)

//array destructuring
const array:number[]=[3,39,30,-10]
const [a, b, c] = array;
console.log(a,b,c)

//object destructuring
const teacher:{myname:string,age:number}={myname:'scott',age:43};
const {myname, age} = teacher;
console.log(myname, age)

//Classes
class Person{
    private type:string|null=null;
    protected age:number=30;

    constructor(public name:string,public userName:string,private email:string){
        this.name = name;
        this.userName = userName;
        this.email = email;
    }

     printAge=()=>{
        console.log(this.age);
        console.log(this.name,this.userName)
        this.setType('young guy')
    }

    private setType=(type:string)=>{
        this.type = type;
        console.log(this.type)
    }


}


const person = new Person('scott','song','test@qq.com');
person.printAge()
