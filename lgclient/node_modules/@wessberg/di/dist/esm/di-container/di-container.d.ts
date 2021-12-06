import { IGetOptions } from "../get-options/i-get-options";
import { IHasOptions } from "../has-options/i-has-options";
import { IRegisterOptionsWithImplementation, IRegisterOptionsWithoutImplementation, RegisterOptions } from "../register-options/i-register-options";
import { IDIContainer } from "./i-di-container";
import { ImplementationInstance } from "../implementation/implementation";
/**
 * A Dependency-Injection container that holds services and can produce instances of them as required.
 * It mimics reflection by parsing the app at compile-time and supporting the generic-reflection syntax.
 * @author Frederik Wessberg
 */
export declare class DIContainer implements IDIContainer {
    /**
     * A map between interface names and the services that should be dependency injected
     * @type {Map<string, ConstructorArgument[]>}
     */
    private readonly constructorArguments;
    /**
     * A Map between identifying names for services and their IRegistrationRecords.
     * @type {Map<string, RegistrationRecord<{}, {}>>}
     */
    private readonly serviceRegistry;
    /**
     * A map between identifying names for services and concrete instances of their implementation.
     * @type {Map<string, *>}
     */
    private readonly instances;
    /**
     * Registers a service that will be instantiated once in the application lifecycle. All requests
     * for the service will retrieve the same instance of it.
     *
     * You should not pass any options to the method if using the compiler. It will do that automatically.
     * @param {() => U} [newExpression]
     * @param {RegisterOptions<U>} [options]
     * @returns {void}
     */
    registerSingleton<T, U extends T = T>(newExpression: ImplementationInstance<U>, options: IRegisterOptionsWithoutImplementation<U>): void;
    registerSingleton<T, U extends T = T>(newExpression: undefined, options: IRegisterOptionsWithImplementation<U>): void;
    registerSingleton<T, U extends T = T>(newExpression?: ImplementationInstance<U> | undefined, options?: RegisterOptions<U>): void;
    /**
     * Registers a service that will be instantiated every time it is requested throughout the application lifecycle.
     * This means that every call to get() will return a unique instance of the service.
     *
     * You should not pass any options to the method if using the compiler. It will do that automatically.
     * @param {() => U} [newExpression]
     * @param {RegisterOptions<U>} [options]
     * @returns {void}
     */
    registerTransient<T, U extends T = T>(newExpression: ImplementationInstance<U>, options: IRegisterOptionsWithoutImplementation<U>): void;
    registerTransient<T, U extends T = T>(newExpression: undefined, options: IRegisterOptionsWithImplementation<U>): void;
    registerTransient<T, U extends T = T>(newExpression?: ImplementationInstance<U> | undefined, options?: RegisterOptions<U>): void;
    /**
     * Gets an instance of the service matching the interface given as a generic type parameter.
     * For example, 'container.get<IFoo>()' returns a concrete instance of the implementation associated with the
     * generic interface name.
     *
     * You should not pass any options to the method if using the compiler. It will do that automatically.
     * @param {IGetOptions} [options]
     * @returns {T}
     */
    get<T>(options?: IGetOptions): T;
    /**
     * Returns true if a service has been registered matching the interface given as a generic type parameter.
     * For example, 'container.get<IFoo>()' returns a concrete instance of the implementation associated with the
     * generic interface name.
     *
     * You should not pass any options to the method if using the compiler. It will do that automatically.
     * @param {IGetOptions} [options]
     * @returns {boolean}
     */
    has<T>(options?: IHasOptions): boolean;
    /**
     * Registers a service
     * @param {RegistrationKind} kind
     * @param {() => U} newExpression
     * @param {RegisterOptions<U extends T>} options
     */
    private register;
    /**
     * Returns true if an instance exists that matches the given identifier.
     * @param {string} identifier
     * @returns {boolean}
     */
    private hasInstance;
    /**
     * Gets the cached instance, if any, associated with the given identifier.
     * @param {string} identifier
     * @returns {T|null}
     */
    private getInstance;
    /**
     * Gets an IRegistrationRecord associated with the given identifier.
     * @param {string} identifier
     * @param {string} [parent]
     * @returns {RegistrationRecord<T>}
     */
    private getRegistrationRecord;
    /**
     * Caches the given instance so that it can be retrieved in the future.
     * @param {string} identifier
     * @param {T} instance
     * @returns {T}
     */
    private setInstance;
    /**
     * Gets a lazy reference to another service
     * @param lazyPointer
     */
    private getLazyIdentifier;
    /**
     * Constructs a new instance of the given identifier and returns it.
     * It checks the constructor arguments and injects any services it might depend on recursively.
     * @param {IConstructInstanceOptions<T>} options
     * @returns {T}
     */
    private constructInstance;
}
